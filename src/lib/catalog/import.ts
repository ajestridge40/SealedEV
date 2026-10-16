import Papa from "papaparse";
import type { CardFinish, OddsSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseProductType } from "@/lib/product-types";
import { recordProductPrice } from "@/lib/pricing/snapshots";
import { slugify } from "@/lib/utils";
import { cardKey } from "./card-key";

/**
 * CSV import. Two formats (header row required, column order free):
 *
 * products:  game,set,name,product_type,msrp,market_price,release_date,pack_type,packs,cards_per_pack,tcgplayer_product_id,tcgplayer_group_id
 * tiers:     game,set,pack_type,tier,per_pack,pool_size,unlisted_value,odds_source,odds_note,odds_url,is_chase,
 *            sync_rarities (; separated),sync_subtype,sync_name_contains,sync_include_variants
 * cards:     game,set,pack_type,tier,name,number,rarity,finish,variant,price,tcgplayer_product_id,scryfall_id,pokemontcg_id
 *
 * Sets and pack types are created on the fly. per_pack accepts "1/87",
 * "1 in 87" or a decimal. Rows are processed independently; failures are reported.
 */
export type ImportKind = "products" | "tiers" | "cards";

export interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

export type Row = Record<string, string>;

const truthy = (v: string | undefined) => ["1", "true", "yes", "y"].includes((v ?? "").trim().toLowerCase());
const num = (v: string | undefined) => (v == null || v.trim() === "" ? null : Number(v.replace(/[$,]/g, "")));

export function parsePerPack(v: string): number {
  const s = v.trim().toLowerCase();
  const m = s.match(/^1\s*(?:\/|in)\s*([\d.]+)/);
  const n = m ? 1 / Number(m[1]) : Number(s);
  if (!Number.isFinite(n) || n < 0) throw new Error(`invalid per_pack "${v}"`);
  return n;
}

async function resolveSet(row: Row) {
  const game = await prisma.game.findFirst({ where: { OR: [{ slug: row.game?.trim() }, { name: row.game?.trim() }, { shortName: row.game?.trim() }] } });
  if (!game) throw new Error(`unknown game "${row.game}" (add it to src/lib/games.ts and re-seed)`);
  if (!row.set?.trim()) throw new Error("missing set");
  const set = await prisma.set.upsert({
    where: { gameId_name: { gameId: game.id, name: row.set.trim() } },
    create: { gameId: game.id, name: row.set.trim(), releaseDate: row.release_date ? new Date(row.release_date) : null },
    update: {},
  });
  return { game, set };
}

async function resolvePackType(setId: string, name: string | undefined, cardsPerPack?: number | null) {
  const packName = name?.trim() || "Booster Pack";
  return prisma.packType.upsert({
    where: { setId_name: { setId, name: packName } },
    create: { setId, name: packName, cardsPerPack: cardsPerPack ?? 10 },
    update: cardsPerPack ? { cardsPerPack } : {},
  });
}

export async function importProduct(row: Row): Promise<"created" | "updated"> {
  const { game, set } = await resolveSet(row);
  const type = parseProductType(row.product_type ?? "");
  if (!type) throw new Error(`unknown product_type "${row.product_type}"`);
  if (!row.name?.trim()) throw new Error("missing name");
  const slug = slugify(`${game.slug} ${row.name}`);
  const packs = num(row.packs);
  const packType = await resolvePackType(set.id, row.pack_type, num(row.cards_per_pack));
  const data = {
    name: row.name.trim(),
    gameId: game.id,
    setId: set.id,
    productType: type,
    msrp: num(row.msrp),
    releaseDate: row.release_date ? new Date(row.release_date) : null,
    tcgplayerProductId: num(row.tcgplayer_product_id),
  };
  const existing = await prisma.product.findUnique({ where: { slug } });
  const product = existing
    ? await prisma.product.update({ where: { id: existing.id }, data })
    : await prisma.product.create({ data: { ...data, slug } });
  if (packs) {
    await prisma.productPack.upsert({
      where: { productId_packTypeId: { productId: product.id, packTypeId: packType.id } },
      create: { productId: product.id, packTypeId: packType.id, count: packs },
      update: { count: packs },
    });
  }
  const groupId = num(row.tcgplayer_group_id);
  if (groupId) await prisma.set.update({ where: { id: set.id }, data: { tcgplayerGroupId: groupId } });
  const price = num(row.market_price);
  if (price != null) await recordProductPrice(product.id, price, "CSV_IMPORT");
  return existing ? "updated" : "created";
}

async function importTier(row: Row): Promise<"created" | "updated"> {
  const { set } = await resolveSet(row);
  const packType = await resolvePackType(set.id, row.pack_type);
  if (!row.tier?.trim()) throw new Error("missing tier");
  const source = (row.odds_source?.trim().toUpperCase() || "ESTIMATE") as OddsSource;
  if (!["PUBLISHED", "COMMUNITY", "ESTIMATE"].includes(source)) throw new Error(`odds_source must be PUBLISHED, COMMUNITY or ESTIMATE`);
  if (source === "PUBLISHED" && !row.odds_url?.trim()) throw new Error("PUBLISHED odds need an odds_url to the official source");
  const data = {
    perPack: parsePerPack(row.per_pack ?? ""),
    poolSize: Math.max(1, num(row.pool_size) ?? 1),
    unlistedCardValue: num(row.unlisted_value) ?? 0,
    oddsSource: source,
    oddsSourceNote: row.odds_note?.trim() || null,
    oddsSourceUrl: row.odds_url?.trim() || null,
    isChase: truthy(row.is_chase),
    ...(row.sync_rarities !== undefined || row.sync_name_contains !== undefined
      ? {
          syncRarities: (row.sync_rarities ?? "")
            .split(";")
            .map((r) => r.trim())
            .filter(Boolean),
          syncSubType: row.sync_subtype?.trim() || null,
          syncNameContains: row.sync_name_contains?.trim() || null,
          syncIncludeVariants: truthy(row.sync_include_variants),
        }
      : {}),
  };
  const key = { packTypeId_name: { packTypeId: packType.id, name: row.tier.trim() } };
  const existing = await prisma.pullTier.findUnique({ where: key });
  await prisma.pullTier.upsert({ where: key, create: { packTypeId: packType.id, name: row.tier.trim(), ...data }, update: data });
  return existing ? "updated" : "created";
}

async function importCard(row: Row): Promise<"created" | "updated"> {
  const { set } = await resolveSet(row);
  if (!row.name?.trim()) throw new Error("missing name");
  const finish = ((row.finish?.trim().toUpperCase() || "NONFOIL") as CardFinish);
  if (!["NONFOIL", "FOIL", "OTHER"].includes(finish)) throw new Error("finish must be NONFOIL, FOIL or OTHER");
  const c = { name: row.name.trim(), number: row.number?.trim() || null, finish, variant: row.variant?.trim() || null };
  const key = cardKey(c);
  const price = num(row.price);
  const data = {
    ...c,
    rarity: row.rarity?.trim() || null,
    tcgplayerProductId: num(row.tcgplayer_product_id),
    scryfallId: row.scryfall_id?.trim() || null,
    pokemontcgId: row.pokemontcg_id?.trim() || null,
    ...(price != null ? { marketPrice: price, priceSource: "CSV_IMPORT", priceUpdatedAt: new Date() } : {}),
  };
  const existing = await prisma.card.findUnique({ where: { setId_key: { setId: set.id, key } } });
  const card = await prisma.card.upsert({
    where: { setId_key: { setId: set.id, key } },
    create: { setId: set.id, key, ...data },
    update: data,
  });
  if (row.tier?.trim()) {
    const packType = await resolvePackType(set.id, row.pack_type);
    const tier = await prisma.pullTier.findUnique({ where: { packTypeId_name: { packTypeId: packType.id, name: row.tier.trim() } } });
    if (!tier) throw new Error(`tier "${row.tier}" not found in ${set.name} / ${packType.name} — import tiers first`);
    await prisma.tierCard.upsert({
      where: { tierId_cardId: { tierId: tier.id, cardId: card.id } },
      create: { tierId: tier.id, cardId: card.id },
      update: {},
    });
  }
  return existing ? "updated" : "created";
}

export async function importCsv(kind: ImportKind, csv: string): Promise<ImportResult> {
  const parsed = Papa.parse<Row>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  const result: ImportResult = { created: 0, updated: 0, errors: parsed.errors.map((e) => `row ${(e.row ?? 0) + 2}: ${e.message}`) };
  const handler = kind === "products" ? importProduct : kind === "tiers" ? importTier : importCard;
  for (const [i, row] of parsed.data.entries()) {
    try {
      result[await handler(row)]++;
    } catch (e) {
      result.errors.push(`row ${i + 2}: ${(e as Error).message}`);
    }
  }
  return result;
}
