import type { CardFinish, OddsSource, ProductType } from "@prisma/client";

/**
 * Declarative seed format. One SeedSet = a set, its pack types (with pull
 * tiers and notable cards) and the sealed products built from those packs.
 *
 * Honesty rules for seed data:
 *  - oddsSource PUBLISHED only with a manufacturer link in oddsSourceUrl.
 *  - COMMUNITY = rates from public opening samples / trackers (cite them).
 *  - ESTIMATE  = our rough approximation; replace when better data exists.
 *  - Prices are approximate snapshots tagged SEED_ESTIMATE so the app shows
 *    them as stale/low-confidence until a real refresh or manual update.
 */
export interface SeedCard {
  name: string;
  number?: string;
  rarity?: string;
  finish?: CardFinish;
  variant?: string;
  price: number;
}

export interface SeedTier {
  name: string;
  rarity?: string;
  perPack: number;
  oddsSource: OddsSource;
  oddsSourceNote?: string;
  oddsSourceUrl?: string;
  poolSize: number;
  unlistedCardValue: number;
  isChase?: boolean;
  cards?: SeedCard[];
  /** TCGplayer sync (see PullTier in schema.prisma). Leave unset to keep the tier manual. */
  syncRarities?: string[];
  syncSubType?: string;
  syncNameContains?: string;
  syncIncludeVariants?: boolean;
}

export interface SeedPackType {
  name: string;
  cardsPerPack: number;
  notes?: string;
  tiers: SeedTier[];
}

export interface SeedProduct {
  name: string;
  slug: string;
  productType: ProductType;
  msrp: number | null;
  marketPrice: number | null;
  releaseDate?: string;
  notes?: string;
  packs: { packType: string; count: number }[];
  extras?: { name: string; value: number; liquidate?: boolean; note?: string }[];
}

export interface SeedSet {
  game: string; // GameConfig.slug
  name: string;
  code?: string;
  releaseDate: string;
  packTypes: SeedPackType[];
  products: SeedProduct[];
}

/** Date attached to all seed prices. They are approximations, not live data. */
export const SEED_PRICE_DATE = new Date("2025-06-01T00:00:00Z");
