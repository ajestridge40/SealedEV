import { describe, expect, it } from "vitest";
import { breakEven, calculateEv, cardValue, confidence, poissonAtLeast, rateValue } from ".";
import type { EvProductInput, LiquidationSettings } from ".";

const settings: LiquidationSettings = { feePct: 0.1, perCardCost: 1, sellThreshold: 2, bulkValue: 0.01 };

const product: EvProductInput = {
  price: 100,
  packs: [
    {
      packTypeId: "p",
      name: "Booster",
      count: 10,
      cardsPerPack: 10,
      tiers: [
        {
          id: "bulk",
          name: "Commons",
          perPack: 5,
          poolSize: 50,
          unlistedCardValue: 0.1,
          oddsSource: "PUBLISHED",
          isChase: false,
          cards: [],
        },
        {
          id: "chase",
          name: "Secret Rare",
          perPack: 0.1, // 1 in 10
          poolSize: 4,
          unlistedCardValue: 10,
          oddsSource: "COMMUNITY",
          isChase: true,
          cards: [
            { id: "a", name: "Big Hit", price: 200 },
            { id: "b", name: "Mid Hit", price: 30 },
            { id: "c", name: "Unpriced", price: null },
          ],
        },
      ],
    },
  ],
  extras: [{ name: "Promo", value: 5, liquidate: true }],
};

describe("cardValue", () => {
  it("is identity in raw mode", () => expect(cardValue(50, "raw", settings)).toBe(50));
  it("applies fees and per-card cost above threshold", () => expect(cardValue(50, "net", settings)).toBeCloseTo(44));
  it("bulks cards under the threshold", () => expect(cardValue(1.5, "net", settings)).toBe(0.01));
  it("never values a card below what it is worth as bulk", () => expect(cardValue(2, "net", settings)).toBeCloseTo(0.8));
  it("doesn't inflate sub-bulk cards", () => expect(cardValue(0.005, "net", settings)).toBe(0.005));
});

describe("calculateEv (raw)", () => {
  const r = calculateEv(product, "raw", settings);
  const [commons, chase] = r.packs[0].tiers;

  it("averages listed + unlisted cards across the pool", () => {
    // (200 + 30 + 2 × 10) / 4 = 62.5
    expect(chase.avgCardValue).toBeCloseTo(62.5);
    expect(chase.evPerPack).toBeCloseTo(6.25);
    expect(chase.evTotal).toBeCloseTo(62.5);
  });
  it("sums tiers, packs and extras", () => {
    expect(commons.evTotal).toBeCloseTo(5 * 0.1 * 10);
    expect(r.ev).toBeCloseTo(5 + 62.5 + 5);
    expect(r.diff).toBeCloseTo(72.5 - 100);
    expect(r.roi).toBeCloseTo(-0.275);
  });
  it("computes hit probability", () => {
    expect(chase.expectedCount).toBeCloseTo(1);
    expect(chase.probAtLeastOne).toBeCloseTo(1 - 0.9 ** 10);
  });
  it("ranks top cards", () => expect(chase.topCards[0].name).toBe("Big Hit"));
});

describe("calculateEv (net)", () => {
  it("is lower than raw", () => {
    const raw = calculateEv(product, "raw", settings).ev;
    const net = calculateEv(product, "net", settings).ev;
    expect(net).toBeLessThan(raw);
    // chase: (179 + 26 + 2×8) / 4 = 55.25 → ×1 ; commons: 0.01×5×10 = 0.5 ; promo: 3.5
    expect(net).toBeCloseTo(55.25 + 0.5 + 3.5);
  });
  it("handles missing price", () => {
    const r = calculateEv({ ...product, price: null });
    expect(r.roi).toBeNull();
    expect(rateValue(r.roi)).toBe("UNKNOWN");
  });
});

describe("breakEven", () => {
  it("finds chases needed", () => {
    const r = calculateEv(product, "raw", settings);
    const be = breakEven(r)!;
    expect(be.baseEv).toBeCloseTo(10);
    expect(be.avgChaseValue).toBeCloseTo(62.5);
    expect(be.chasesNeeded).toBeCloseTo(90 / 62.5);
    expect(be.probBreakEven).toBeCloseTo(poissonAtLeast(2, 1));
  });
  it("poisson sanity", () => {
    expect(poissonAtLeast(0, 3)).toBe(1);
    expect(poissonAtLeast(1, 1)).toBeCloseTo(1 - Math.exp(-1));
  });
});

describe("rating + confidence", () => {
  it("rates", () => {
    expect(rateValue(0.2)).toBe("GOOD");
    expect(rateValue(0)).toBe("FAIR");
    expect(rateValue(-0.3)).toBe("OVERPRICED");
  });
  it("seed-estimate prices never produce high confidence", () => {
    const r = calculateEv(product);
    const c = confidence(r, {
      productPriceAt: new Date(),
      productPriceSource: "SEED_ESTIMATE",
      cardPrices: [{ at: new Date(), source: "SEED_ESTIMATE" }],
    });
    expect(c.level).not.toBe("HIGH");
  });
});
