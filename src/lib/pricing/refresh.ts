import { prisma } from "@/lib/db";
import { evaluateAlerts } from "@/lib/alerts";
import { CARD_PROVIDERS, PRODUCT_PROVIDERS } from "./registry";
import { recordEvSnapshots, recordProductPrice } from "./snapshots";
import type { CardPriceTarget, ProductPriceTarget } from "./types";

export interface RefreshReport {
  startedAt: string;
  finishedAt: string;
  products: { total: number; updated: number; noExternalId: number };
  cards: { total: number; updated: number; noExternalId: number };
  providers: { id: string; kind: "product" | "card"; quotes: number; missing: number; errors: string[] }[];
  evSnapshots: number;
  alertsFired: number;
}

/**
 * Daily/on-demand job:
 *  1. ask each product provider for sealed prices → product price + daily snapshot
 *  2. ask each card provider for single prices → card prices
 *  3. record today's EV for every product
 *  4. evaluate watchlist alerts
 * Items without external ids are skipped and counted, so data gaps are visible.
 */
export async function runPriceRefresh(now = new Date()): Promise<RefreshReport> {
  const startedAt = new Date().toISOString();
  const providers: RefreshReport["providers"] = [];

  // 1. Sealed products
  const products = await prisma.product.findMany({ include: { game: true, set: true } });
  const productTargets: ProductPriceTarget[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    tcgplayerProductId: p.tcgplayerProductId,
    tcgplayerCategoryId: p.game.tcgplayerCategoryId,
    tcgplayerGroupId: p.set.tcgplayerGroupId,
  }));
  const productDone = new Set<string>();
  for (const provider of PRODUCT_PROVIDERS.filter((p) => p.enabled())) {
    const res = await provider.fetchProductPrices(productTargets.filter((t) => !productDone.has(t.id)));
    for (const [id, q] of res.quotes) {
      await recordProductPrice(id, q.price, q.source, now);
      productDone.add(id);
    }
    providers.push({ id: provider.id, kind: "product", quotes: res.quotes.size, missing: res.missing.length, errors: res.errors });
  }

  // 2. Cards
  const cards = await prisma.card.findMany({ include: { set: { include: { game: true } } } });
  const cardTargets: CardPriceTarget[] = cards.map((c) => ({
    id: c.id,
    name: c.name,
    number: c.number,
    finish: c.finish,
    variant: c.variant,
    gameSlug: c.set.game.slug,
    setCode: c.set.code,
    tcgplayerProductId: c.tcgplayerProductId,
    tcgplayerCategoryId: c.set.game.tcgplayerCategoryId,
    tcgplayerGroupId: c.set.tcgplayerGroupId,
    scryfallId: c.scryfallId,
    pokemontcgId: c.pokemontcgId,
  }));
  const cardDone = new Set<string>();
  for (const provider of CARD_PROVIDERS.filter((p) => p.enabled())) {
    const res = await provider.fetchCardPrices(cardTargets.filter((t) => !cardDone.has(t.id)));
    for (const [id, q] of res.quotes) {
      await prisma.card.update({ where: { id }, data: { marketPrice: q.price, priceSource: q.source, priceUpdatedAt: now } });
      cardDone.add(id);
    }
    providers.push({ id: provider.id, kind: "card", quotes: res.quotes.size, missing: res.missing.length, errors: res.errors });
  }

  // 3 + 4
  const evSnapshots = await recordEvSnapshots(undefined, now);
  const alertsFired = await evaluateAlerts(now);

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    products: {
      total: products.length,
      updated: productDone.size,
      noExternalId: productTargets.filter((t) => !t.tcgplayerProductId).length,
    },
    cards: {
      total: cards.length,
      updated: cardDone.size,
      noExternalId: cardTargets.filter((t) => !t.tcgplayerProductId && !t.scryfallId && !t.pokemontcgId && !(t.gameSlug === "mtg" && t.setCode)).length,
    },
    providers,
    evSnapshots,
    alertsFired,
  };
}
