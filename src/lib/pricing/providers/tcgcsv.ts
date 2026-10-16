import { emptyResult, sleep, type CardPriceProvider, type CardPriceTarget, type ProductPriceProvider, type ProviderResult } from "../types";

/**
 * TCGCSV (https://tcgcsv.com) publishes a daily mirror of TCGplayer prices
 * per category/group. It covers sealed products and singles, which makes it
 * the most practical free source for sealed prices.
 *
 * Needs on our side: Game.tcgplayerCategoryId, Set.tcgplayerGroupId and the
 * item's tcgplayerProductId. Items missing any of those are skipped.
 */
const BASE = "https://tcgcsv.com/tcgplayer";

interface TcgcsvPrice {
  productId: number;
  marketPrice: number | null;
  midPrice: number | null;
  subTypeName: string;
}

async function fetchGroupPrices(categoryId: number, groupId: number): Promise<TcgcsvPrice[]> {
  const res = await fetch(`${BASE}/${categoryId}/${groupId}/prices`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TCGCSV ${categoryId}/${groupId}: HTTP ${res.status}`);
  const body = (await res.json()) as { success?: boolean; results?: TcgcsvPrice[] };
  return body.results ?? [];
}

type Target = { id: string; tcgplayerProductId: number | null; tcgplayerCategoryId: number | null; tcgplayerGroupId: number | null };

/** Prefer the sub-type matching the finish, else the first with a market price. */
function pickPrice(rows: TcgcsvPrice[], finish?: CardPriceTarget["finish"]): number | null {
  const withPrice = rows.filter((r) => (r.marketPrice ?? r.midPrice) != null);
  const prefer = finish === "FOIL" ? ["Foil", "Holofoil", "Reverse Holofoil"] : ["Normal", "Holofoil", "Unlimited"];
  const row = prefer.map((n) => withPrice.find((r) => r.subTypeName === n)).find(Boolean) ?? withPrice[0];
  return row ? (row.marketPrice ?? row.midPrice) : null;
}

async function run(targets: (Target & { finish?: CardPriceTarget["finish"] })[]): Promise<ProviderResult> {
  const result = emptyResult();
  const groups = new Map<string, typeof targets>();
  for (const t of targets) {
    if (!t.tcgplayerProductId || !t.tcgplayerCategoryId || !t.tcgplayerGroupId) continue;
    const k = `${t.tcgplayerCategoryId}/${t.tcgplayerGroupId}`;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  for (const [k, items] of groups) {
    const [cat, group] = k.split("/").map(Number);
    try {
      const rows = await fetchGroupPrices(cat, group);
      const byProduct = new Map<number, TcgcsvPrice[]>();
      for (const r of rows) byProduct.set(r.productId, [...(byProduct.get(r.productId) ?? []), r]);
      for (const t of items) {
        const price = pickPrice(byProduct.get(t.tcgplayerProductId!) ?? [], t.finish);
        if (price != null) result.quotes.set(t.id, { price, source: "TCGCSV" });
        else result.missing.push(t.id);
      }
    } catch (e) {
      result.errors.push((e as Error).message);
    }
    await sleep(150);
  }
  return result;
}

const enabled = () => process.env.ENABLE_TCGCSV !== "0";

export const tcgcsvProductProvider: ProductPriceProvider = {
  id: "TCGCSV",
  enabled,
  fetchProductPrices: (targets) => run(targets),
};

export const tcgcsvCardProvider: CardPriceProvider = {
  id: "TCGCSV",
  enabled,
  fetchCardPrices: (targets) => run(targets),
};
