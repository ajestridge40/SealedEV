import { emptyResult, type CardPriceProvider, type CardPriceTarget, type ProductPriceProvider, type ProviderResult } from "../types";
import type { TcgcsvClient, TcgPrice } from "../tcgcsv/client";
import { pickPrice } from "../tcgcsv/match";

/**
 * Prices from TCGCSV (free daily TCGplayer mirror) for sealed products and
 * singles. Needs Game.tcgplayerCategoryId, Set.tcgplayerGroupId and the item's
 * tcgplayerProductId — the auto-link step (tcgcsv/link.ts) fills those in.
 */
type Target = {
  id: string;
  tcgplayerProductId: number | null;
  tcgplayerCategoryId: number | null;
  tcgplayerGroupId: number | null;
  finish?: CardPriceTarget["finish"];
  tcgplayerSubType?: string | null;
};

async function run(client: TcgcsvClient, targets: Target[]): Promise<ProviderResult> {
  const result = emptyResult();
  const groups = new Map<string, Target[]>();
  for (const t of targets) {
    if (!t.tcgplayerProductId || !t.tcgplayerCategoryId || !t.tcgplayerGroupId) continue;
    const k = `${t.tcgplayerCategoryId}/${t.tcgplayerGroupId}`;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  for (const [k, items] of groups) {
    const [cat, group] = k.split("/").map(Number);
    try {
      const byProduct = new Map<number, TcgPrice[]>();
      for (const r of await client.prices(cat, group)) byProduct.set(r.productId, [...(byProduct.get(r.productId) ?? []), r]);
      for (const t of items) {
        const price = pickPrice(byProduct.get(t.tcgplayerProductId!) ?? [], { subType: t.tcgplayerSubType, finish: t.finish });
        if (price != null) result.quotes.set(t.id, { price, source: "TCGCSV" });
        else result.missing.push(t.id);
      }
    } catch (e) {
      result.errors.push((e as Error).message);
    }
  }
  return result;
}

export const tcgcsvEnabled = () => process.env.ENABLE_TCGCSV !== "0";

export function tcgcsvProviders(client: TcgcsvClient): { product: ProductPriceProvider; card: CardPriceProvider } {
  return {
    product: { id: "TCGCSV", enabled: tcgcsvEnabled, fetchProductPrices: (t) => run(client, t) },
    card: { id: "TCGCSV", enabled: tcgcsvEnabled, fetchCardPrices: (t) => run(client, t) },
  };
}
