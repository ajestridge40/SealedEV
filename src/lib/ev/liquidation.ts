import type { EvMode, LiquidationSettings } from "./types";

/**
 * Defaults roughly reflect selling singles on TCGplayer/eBay in the US:
 * ~13% combined marketplace + payment fees, ~$1 per card for shipping and
 * supplies, singles under $2 dumped into bulk at ~1¢ each. Users can
 * override these on /settings.
 */
export const DEFAULT_LIQUIDATION: LiquidationSettings = {
  feePct: 0.13,
  perCardCost: 1.0,
  sellThreshold: 2.0,
  bulkValue: 0.01,
};

/**
 * Cash you would realistically get for one card worth `marketValue`.
 *
 *   raw mode:  value = marketValue
 *   net mode:  below sellThreshold → min(marketValue, bulkValue)
 *              otherwise           → max(bulk, marketValue × (1 − feePct) − perCardCost)
 *
 * The max() reflects that you'd bulk a card rather than sell it at a loss.
 */
export function cardValue(marketValue: number, mode: EvMode, s: LiquidationSettings): number {
  if (mode === "raw") return marketValue;
  const bulk = Math.min(marketValue, s.bulkValue);
  if (marketValue < s.sellThreshold) return bulk;
  return Math.max(bulk, marketValue * (1 - s.feePct) - s.perCardCost);
}

export function mergeLiquidation(
  overrides: Partial<Record<keyof LiquidationSettings, number | null | undefined>> | null | undefined,
): LiquidationSettings {
  const out = { ...DEFAULT_LIQUIDATION };
  if (!overrides) return out;
  for (const key of Object.keys(out) as (keyof LiquidationSettings)[]) {
    const v = overrides[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  }
  return out;
}
