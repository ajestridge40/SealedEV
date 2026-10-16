import type { CardFinish } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cardKey } from "@/lib/catalog/card-key";
import type { TcgcsvClient, TcgGroup, TcgProduct } from "./client";
import { cardsForTier, ext, matchCard, matchGroup, matchSealedProduct, normNumber, rarities, tierSyncEnabled, type MatchResult } from "./match";

/**
 * Daily "auto-link" step that runs before prices are fetched:
 *  1. sets     → TCGplayer group id (by name)
 *  2. products → TCGplayer product id (sealed items in that group, by name)
 *  3. cards    → TCGplayer product id (by number, or name + rarity)
 *  4. synced tiers → link every card of the configured rarity, set poolSize
 *
 * Only items without an id are matched, so ids you set by hand are never
 * overwritten. Ambiguous matches are skipped and listed in the report.
 */
export interface Unmatched {
  kind: "set" | "product" | "card" | "tier";
  name: string;
  reason: string;
  candidates: string[];
}

export interface LinkReport {
  setsLinked: number;
  productsLinked: number;
  cardsLinked: number;
  tiersSynced: number;
  tierCardsLinked: number;
  tierCardsUnlinked: number;
  unmatched: Unmatched[];
  errors: string[];
}

const describe = (p: TcgProduct | TcgGroup) => `${p.name} (${"productId" in p ? p.productId : p.groupId})`;

function unmatched<T extends TcgProduct | TcgGroup>(kind: Unmatched["kind"], name: string, r: MatchResult<T>): Unmatched | null {
  return "reason" in r ? { kind, name, reason: r.reason, candidates: r.candidates.map(describe) } : null;
}

/** "Beza, the Bounding Spring (Borderless) - 300" → name "Beza, the Bounding Spring", variant "Borderless" */
function displayName(p: TcgProduct): { name: string; variant: string | null } {
  const noNum = p.name.replace(/\s+-\s+[A-Za-z]*\d+[A-Za-z]*(\/\w+)?\s*$/, "");
  const variant = [...noNum.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]).join(" ") || null;
  return { name: noNum.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim(), variant };
}

const finishFor = (subType: string | null): CardFinish => (subType && /foil/i.test(subType) ? "FOIL" : "NONFOIL");

export async function linkTcgplayer(client: TcgcsvClient, now = new Date()): Promise<LinkReport> {
  const report: LinkReport = {
    setsLinked: 0,
    productsLinked: 0,
    cardsLinked: 0,
    tiersSynced: 0,
    tierCardsLinked: 0,
    tierCardsUnlinked: 0,
    unmatched: [],
    errors: [],
  };
  const note = (u: Unmatched | null) => u && report.unmatched.push(u);

  const sets = await prisma.set.findMany({
    where: { game: { tcgplayerCategoryId: { not: null } } },
    include: { game: true, products: true, cards: true, packTypes: { include: { tiers: { include: { cards: true } } } } },
  });

  for (const set of sets) {
    const categoryId = set.game.tcgplayerCategoryId!;
    try {
      // 1. Set → group
      const groups = await client.groups(categoryId);
      let groupId = set.tcgplayerGroupId;
      if (!groupId) {
        const r = matchGroup(set.name, set.code, groups);
        note(unmatched("set", `${set.game.shortName} / ${set.name}`, r));
        if (!r.match) continue;
        groupId = r.match.groupId;
        await prisma.set.update({ where: { id: set.id }, data: { tcgplayerGroupId: groupId } });
        report.setsLinked++;
      }
      const group = groups.find((g) => g.groupId === groupId);
      const catalogue = await client.products(categoryId, groupId);

      // 2. Sealed products
      for (const product of set.products.filter((p) => !p.tcgplayerProductId)) {
        const r = matchSealedProduct(product.name, [set.name, group?.name ?? ""], catalogue);
        note(unmatched("product", product.name, r));
        if (!r.match) continue;
        await prisma.product.update({
          where: { id: product.id },
          data: { tcgplayerProductId: r.match.productId, imageUrl: product.imageUrl ?? r.match.imageUrl ?? null },
        });
        report.productsLinked++;
      }

      // 3. Hand-listed cards
      for (const card of set.cards.filter((c) => !c.tcgplayerProductId)) {
        const r = matchCard(card, catalogue);
        note(unmatched("card", `${set.name} / ${card.name}${card.variant ? ` (${card.variant})` : ""}`, r));
        if (!r.match) continue;
        await prisma.card.update({
          where: { id: card.id },
          data: {
            tcgplayerProductId: r.match.productId,
            number: card.number ?? ext(r.match, "Number")?.split("/")[0] ?? null,
            rarity: card.rarity ?? ext(r.match, "Rarity"),
          },
        });
        report.cardsLinked++;
      }

      // 4. Synced tiers
      const tiers = set.packTypes.flatMap((pt) => pt.tiers.map((t) => ({ ...t, packTypeName: pt.name }))).filter(tierSyncEnabled);
      for (const tier of tiers) {
        const products = cardsForTier(tier, catalogue);
        const label = `${set.name} / ${tier.packTypeName} / ${tier.name}`;
        if (products.length === 0) {
          report.unmatched.push({
            kind: "tier",
            name: label,
            reason: `no cards matched rarities [${tier.syncRarities.join(", ")}]${tier.syncNameContains ? ` containing "${tier.syncNameContains}"` : ""}`,
            candidates: [`rarities in this set: ${rarities(catalogue).join(", ")}`],
          });
          continue;
        }

        const finish = finishFor(tier.syncSubType);
        const existing = await prisma.card.findMany({ where: { setId: set.id } });
        const byPid = new Map(existing.filter((c) => c.tcgplayerProductId && c.finish === finish).map((c) => [c.tcgplayerProductId!, c]));
        const byKey = new Map(existing.map((c) => [c.key, c]));

        const toCreate = [];
        for (const p of products) {
          if (byPid.has(p.productId)) continue;
          const { name, variant } = displayName(p);
          const number = ext(p, "Number")?.split("/")[0] ?? null;
          const key = cardKey({ name, number: number ? normNumber(number) : null, finish, variant });
          const keyed = byKey.get(key);
          if (keyed) {
            // Same card added by hand/seed without an id — adopt it.
            await prisma.card.update({ where: { id: keyed.id }, data: { tcgplayerProductId: p.productId, tcgplayerSubType: tier.syncSubType } });
            byPid.set(p.productId, keyed);
            continue;
          }
          toCreate.push({
            setId: set.id,
            key,
            name,
            number,
            variant,
            finish,
            rarity: ext(p, "Rarity"),
            tcgplayerProductId: p.productId,
            tcgplayerSubType: tier.syncSubType,
          });
        }
        if (toCreate.length) await prisma.card.createMany({ data: toCreate, skipDuplicates: true });

        const pids = products.map((p) => p.productId);
        const synced = await prisma.card.findMany({
          where: { setId: set.id, finish, tcgplayerProductId: { in: pids } },
          select: { id: true },
        });
        const syncedIds = synced.map((c) => c.id);
        const linked = await prisma.tierCard.createMany({
          data: syncedIds.map((cardId) => ({ tierId: tier.id, cardId })),
          skipDuplicates: true,
        });
        // TCGplayer is the source of truth for a synced tier: drop links to cards
        // that aren't in it (usually hand-listed duplicates that failed to match).
        const unlinked = await prisma.tierCard.deleteMany({ where: { tierId: tier.id, cardId: { notIn: syncedIds } } });
        await prisma.pullTier.update({ where: { id: tier.id }, data: { poolSize: syncedIds.length, lastSyncedAt: now } });

        report.tiersSynced++;
        report.tierCardsLinked += linked.count;
        report.tierCardsUnlinked += unlinked.count;
      }
    } catch (e) {
      report.errors.push(`${set.name}: ${(e as Error).message}`);
    }
  }
  return report;
}
