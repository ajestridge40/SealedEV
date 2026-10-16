/** Value-rating thresholds on ROI = (EV − price) / price. Tweak here. */
export const RATING_THRESHOLDS = {
  good: 0.1, // ≥ +10% → Good Value
  fair: -0.15, // ≥ −15% → Fair, below → Overpriced
} as const;

export type ValueRating = "GOOD" | "FAIR" | "OVERPRICED" | "UNKNOWN";

export function rateValue(roi: number | null): ValueRating {
  if (roi == null || !Number.isFinite(roi)) return "UNKNOWN";
  if (roi >= RATING_THRESHOLDS.good) return "GOOD";
  if (roi >= RATING_THRESHOLDS.fair) return "FAIR";
  return "OVERPRICED";
}

export const RATING_LABEL: Record<ValueRating, string> = {
  GOOD: "Good Value",
  FAIR: "Fair",
  OVERPRICED: "Overpriced",
  UNKNOWN: "No price",
};
