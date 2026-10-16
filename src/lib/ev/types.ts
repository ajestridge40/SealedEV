// Plain input/output types for the EV engine. The engine never touches the
// database: src/lib/data/ev-input.ts maps Prisma rows into these shapes.

export type OddsSource = "PUBLISHED" | "COMMUNITY" | "ESTIMATE";

export type EvMode = "raw" | "net";

export interface EvCardInput {
  id: string;
  name: string;
  number?: string | null;
  /** Market price in USD; null when we have no price. */
  price: number | null;
  priceUpdatedAt?: Date | null;
}

export interface EvTierInput {
  id: string;
  name: string;
  /** Expected number of cards from this tier per pack (1 in 87 => 1/87). */
  perPack: number;
  /** Total distinct cards in this tier. */
  poolSize: number;
  /** Value assumed for each tier card we don't list (or that has no price). */
  unlistedCardValue: number;
  oddsSource: OddsSource;
  oddsSourceNote?: string | null;
  oddsSourceUrl?: string | null;
  isChase: boolean;
  cards: EvCardInput[];
}

export interface EvPackInput {
  packTypeId: string;
  name: string;
  count: number;
  cardsPerPack: number;
  tiers: EvTierInput[];
}

export interface EvExtraInput {
  name: string;
  value: number;
  liquidate: boolean;
}

export interface EvProductInput {
  price: number | null;
  packs: EvPackInput[];
  extras: EvExtraInput[];
}

/** Assumptions used to turn market value into cash-in-hand ("net" mode). */
export interface LiquidationSettings {
  /** Marketplace + payment fees as a fraction of sale price (0.13 = 13%). */
  feePct: number;
  /** Shipping, supplies, sleeves/toploaders per single sold. */
  perCardCost: number;
  /** Cards below this market value are sold as bulk instead of individually. */
  sellThreshold: number;
  /** What one bulk card is worth to a bulk buyer. */
  bulkValue: number;
}

export interface TierResult {
  tierId: string;
  name: string;
  perPack: number;
  oddsSource: OddsSource;
  oddsSourceNote?: string | null;
  oddsSourceUrl?: string | null;
  isChase: boolean;
  poolSize: number;
  listedCount: number;
  pricedCount: number;
  /** Average value of one random card from this tier (mode applied). */
  avgCardValue: number;
  /** perPack × avgCardValue */
  evPerPack: number;
  /** evPerPack × packs in product */
  evTotal: number;
  /** Expected number of these cards in the product. */
  expectedCount: number;
  /** P(at least one) assuming independent packs (real collation may differ). */
  probAtLeastOne: number;
  /** Share of evTotal that comes from cards with a real price (vs assumptions). */
  pricedShare: number;
  topCards: { id: string; name: string; number?: string | null; value: number }[];
}

export interface PackResult {
  packTypeId: string;
  name: string;
  count: number;
  evPerPack: number;
  evTotal: number;
  tiers: TierResult[];
}

export interface ExtraResult {
  name: string;
  value: number;
}

export interface EvResult {
  mode: EvMode;
  price: number | null;
  ev: number;
  packsEv: number;
  extrasEv: number;
  /** ev − price */
  diff: number | null;
  /** (ev − price) / price */
  roi: number | null;
  packs: PackResult[];
  extras: ExtraResult[];
  totalPacks: number;
}
