/**
 * Price provider interfaces. A provider takes the items it can price
 * (it decides via the external ids we store) and returns quotes keyed by our id.
 * Add a provider: implement one or both interfaces and register it in registry.ts.
 */
export interface PriceQuote {
  price: number;
  /** Stored as priceSource / PriceSnapshot.source, e.g. "TCGCSV". */
  source: string;
}

export interface ProductPriceTarget {
  id: string;
  name: string;
  tcgplayerProductId: number | null;
  tcgplayerCategoryId: number | null;
  tcgplayerGroupId: number | null;
}

export interface CardPriceTarget {
  id: string;
  name: string;
  number: string | null;
  finish: "NONFOIL" | "FOIL" | "OTHER";
  variant: string | null;
  gameSlug: string;
  setCode: string | null;
  tcgplayerProductId: number | null;
  tcgplayerCategoryId: number | null;
  tcgplayerGroupId: number | null;
  scryfallId: string | null;
  pokemontcgId: string | null;
}

export interface ProviderResult {
  quotes: Map<string, PriceQuote>;
  /** Items the provider could handle but got no price for. */
  missing: string[];
  errors: string[];
}

export interface ProductPriceProvider {
  id: string;
  enabled(): boolean;
  fetchProductPrices(targets: ProductPriceTarget[]): Promise<ProviderResult>;
}

export interface CardPriceProvider {
  id: string;
  enabled(): boolean;
  fetchCardPrices(targets: CardPriceTarget[]): Promise<ProviderResult>;
}

export function emptyResult(): ProviderResult {
  return { quotes: new Map(), missing: [], errors: [] };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
