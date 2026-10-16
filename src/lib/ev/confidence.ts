import { FRESHNESS_SCORE, freshness, type Freshness } from "./freshness";
import type { EvResult, OddsSource } from "./types";

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface Confidence {
  level: ConfidenceLevel;
  score: number;
  oddsScore: number;
  coverageScore: number;
  freshnessScore: number;
  productFreshness: Freshness;
  reasons: string[];
}

export const ODDS_WEIGHT: Record<OddsSource, number> = { PUBLISHED: 1, COMMUNITY: 0.75, ESTIMATE: 0.4 };

/**
 * Confidence = 0.4 × odds quality + 0.3 × price coverage + 0.3 × freshness
 *  - odds quality: EV-weighted source weight of each tier (published > community > estimate)
 *  - coverage: EV-weighted share of tier value backed by real card prices
 *    (assumed "unlisted card" values count half)
 *  - freshness: average of product-price and card-price freshness
 */
export function confidence(
  result: EvResult,
  opts: {
    productPriceAt?: Date | null;
    productPriceSource?: string | null;
    cardPrices: { at: Date | null | undefined; source?: string | null }[];
    now?: Date;
  },
): Confidence {
  const tiers = result.packs.flatMap((p) => p.tiers);
  const total = tiers.reduce((s, t) => s + t.evTotal, 0);
  const weighted = (f: (t: (typeof tiers)[number]) => number) =>
    total > 0 ? tiers.reduce((s, t) => s + t.evTotal * f(t), 0) / total : 0;

  const oddsScore = weighted((t) => ODDS_WEIGHT[t.oddsSource]);
  const coverageScore = weighted((t) => 0.5 + 0.5 * t.pricedShare);

  const productFreshness = freshness(opts.productPriceAt, opts.productPriceSource, opts.now);
  const cardScores = opts.cardPrices.map((c) => FRESHNESS_SCORE[freshness(c.at, c.source, opts.now)]);
  const cardFreshScore = cardScores.length ? cardScores.reduce((a, b) => a + b, 0) / cardScores.length : 0;
  const freshnessScore = (FRESHNESS_SCORE[productFreshness] + cardFreshScore) / 2;

  const score = 0.4 * oddsScore + 0.3 * coverageScore + 0.3 * freshnessScore;
  const level: ConfidenceLevel = score >= 0.8 ? "HIGH" : score >= 0.6 ? "MEDIUM" : "LOW";

  const reasons: string[] = [];
  if (tiers.some((t) => t.oddsSource === "ESTIMATE")) reasons.push("Some pull rates are rough estimates");
  else if (tiers.every((t) => t.oddsSource === "PUBLISHED")) reasons.push("All pull rates are published odds");
  else reasons.push("Pull rates are community estimates");
  if (coverageScore < 0.75) reasons.push("Much of the EV comes from assumed (unlisted) card values");
  if (productFreshness === "NONE") reasons.push("No market price for the product");
  else if (productFreshness === "STALE") reasons.push("Product price is stale or a seed estimate");
  if (cardFreshScore < 0.5) reasons.push("Card prices are stale or seed estimates");

  return { level, score, oddsScore, coverageScore, freshnessScore, productFreshness, reasons };
}
