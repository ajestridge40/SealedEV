import type { EvResult } from "./types";

export interface BreakEven {
  /** EV from everything except chase tiers. */
  baseEv: number;
  /** EV contributed by chase tiers. */
  chaseEv: number;
  /** Expected number of chase cards in the product. */
  expectedChases: number;
  /** Average value of one chase card (EV-weighted across chase tiers). */
  avgChaseValue: number;
  /** Chase cards needed so base EV + chases ≥ price (0 if base EV already covers it). */
  chasesNeeded: number | null;
  /** P(at least ceil(chasesNeeded) chase cards), Poisson approximation. */
  probBreakEven: number | null;
}

/** Poisson P(N ≥ k) for mean λ. */
export function poissonAtLeast(k: number, lambda: number): number {
  if (k <= 0) return 1;
  let term = Math.exp(-lambda);
  let cdf = term;
  for (let i = 1; i < k; i++) {
    term *= lambda / i;
    cdf += term;
  }
  return Math.max(0, Math.min(1, 1 - cdf));
}

/**
 * "How many chase cards do I need to break even?"
 *
 *   chasesNeeded = max(0, price − baseEv) / avgChaseValue
 *
 * The probability uses a Poisson approximation with λ = expected chases,
 * which assumes independent packs. Real box collation can differ.
 */
export function breakEven(result: EvResult): BreakEven | null {
  const chaseTiers = result.packs.flatMap((p) => p.tiers.filter((t) => t.isChase));
  if (chaseTiers.length === 0) return null;

  const chaseEv = chaseTiers.reduce((s, t) => s + t.evTotal, 0);
  const expectedChases = chaseTiers.reduce((s, t) => s + t.expectedCount, 0);
  const baseEv = result.ev - chaseEv;
  const avgChaseValue = expectedChases > 0 ? chaseEv / expectedChases : 0;

  if (result.price == null || avgChaseValue <= 0) {
    return { baseEv, chaseEv, expectedChases, avgChaseValue, chasesNeeded: null, probBreakEven: null };
  }
  const chasesNeeded = Math.max(0, result.price - baseEv) / avgChaseValue;
  return {
    baseEv,
    chaseEv,
    expectedChases,
    avgChaseValue,
    chasesNeeded,
    probBreakEven: poissonAtLeast(Math.ceil(chasesNeeded), expectedChases),
  };
}
