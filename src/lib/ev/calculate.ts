import { cardValue, DEFAULT_LIQUIDATION } from "./liquidation";
import type {
  EvMode,
  EvProductInput,
  EvResult,
  EvTierInput,
  LiquidationSettings,
  PackResult,
  TierResult,
} from "./types";

/**
 * Expected Value of opening a sealed product.
 *
 *   EV          = Σ_packTypes count × EV_pack  +  Σ extras
 *   EV_pack     = Σ_tiers perPack × avgTierValue
 *   avgTierValue = ( Σ listed priced cards v(price)
 *                  + (poolSize − pricedCount) × v(unlistedCardValue) ) / poolSize
 *
 * v() is identity in "raw" mode and the liquidation function in "net" mode
 * (see liquidation.ts). Every card in a tier is assumed equally likely —
 * the usual assumption for random-insert tiers.
 */
export function calculateTier(
  tier: EvTierInput,
  packCount: number,
  mode: EvMode,
  settings: LiquidationSettings,
): TierResult {
  const priced = tier.cards.filter((c) => c.price != null && c.price >= 0);
  // Never let listed cards exceed the declared pool (bad data) — widen the pool instead.
  const poolSize = Math.max(tier.poolSize, priced.length, 1);
  const unpricedCount = poolSize - priced.length;

  const pricedValues = priced.map((c) => ({
    id: c.id,
    name: c.name,
    number: c.number,
    value: cardValue(c.price as number, mode, settings),
  }));
  const pricedSum = pricedValues.reduce((s, c) => s + c.value, 0);
  const unlistedSum = unpricedCount * cardValue(tier.unlistedCardValue, mode, settings);
  const avgCardValue = (pricedSum + unlistedSum) / poolSize;

  const evPerPack = tier.perPack * avgCardValue;
  const expectedCount = tier.perPack * packCount;
  const p = Math.min(Math.max(tier.perPack, 0), 1);

  return {
    tierId: tier.id,
    name: tier.name,
    perPack: tier.perPack,
    oddsSource: tier.oddsSource,
    oddsSourceNote: tier.oddsSourceNote,
    oddsSourceUrl: tier.oddsSourceUrl,
    isChase: tier.isChase,
    poolSize,
    listedCount: tier.cards.length,
    pricedCount: priced.length,
    avgCardValue,
    evPerPack,
    evTotal: evPerPack * packCount,
    expectedCount,
    probAtLeastOne: 1 - Math.pow(1 - p, packCount),
    pricedShare: pricedSum + unlistedSum > 0 ? pricedSum / (pricedSum + unlistedSum) : 0,
    topCards: pricedValues.sort((a, b) => b.value - a.value).slice(0, 5),
  };
}

export function calculateEv(
  input: EvProductInput,
  mode: EvMode = "raw",
  settings: LiquidationSettings = DEFAULT_LIQUIDATION,
): EvResult {
  const packs: PackResult[] = input.packs.map((pack) => {
    const tiers = pack.tiers.map((t) => calculateTier(t, pack.count, mode, settings));
    const evPerPack = tiers.reduce((s, t) => s + t.evPerPack, 0);
    return {
      packTypeId: pack.packTypeId,
      name: pack.name,
      count: pack.count,
      evPerPack,
      evTotal: evPerPack * pack.count,
      tiers,
    };
  });

  const extras = input.extras.map((e) => ({
    name: e.name,
    value: e.liquidate ? cardValue(e.value, mode, settings) : mode === "raw" ? e.value : 0,
  }));

  const packsEv = packs.reduce((s, p) => s + p.evTotal, 0);
  const extrasEv = extras.reduce((s, e) => s + e.value, 0);
  const ev = packsEv + extrasEv;
  const price = input.price;

  return {
    mode,
    price,
    ev,
    packsEv,
    extrasEv,
    diff: price != null ? ev - price : null,
    roi: price != null && price > 0 ? (ev - price) / price : null,
    packs,
    extras,
    totalPacks: input.packs.reduce((s, p) => s + p.count, 0),
  };
}
