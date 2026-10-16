export type Freshness = "FRESH" | "AGING" | "STALE" | "NONE";

const HOUR = 3_600_000;

/** Seed/demo prices are never treated as fresh, whatever their timestamp. */
export const LOW_TRUST_SOURCES = new Set(["SEED_ESTIMATE", "DEMO"]);

export function freshness(updatedAt: Date | null | undefined, source?: string | null, now = new Date()): Freshness {
  if (!updatedAt) return "NONE";
  if (source && LOW_TRUST_SOURCES.has(source)) return "STALE";
  const age = now.getTime() - updatedAt.getTime();
  if (age <= 36 * HOUR) return "FRESH";
  if (age <= 10 * 24 * HOUR) return "AGING";
  return "STALE";
}

export const FRESHNESS_SCORE: Record<Freshness, number> = { FRESH: 1, AGING: 0.7, STALE: 0.3, NONE: 0 };
