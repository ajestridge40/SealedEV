import { describe, expect, it } from "vitest";
import type { TcgGroup, TcgProduct } from "./client";
import { cardsForTier, matchCard, matchGroup, matchSealedProduct, normNumber, pickPrice, splitCardName } from "./match";

const g = (groupId: number, name: string, extra: Partial<TcgGroup> = {}): TcgGroup => ({ groupId, name, categoryId: 3, ...extra });
const card = (productId: number, name: string, number: string, rarity: string): TcgProduct => ({
  productId,
  name,
  categoryId: 3,
  groupId: 1,
  extendedData: [
    { name: "Number", value: number },
    { name: "Rarity", value: rarity },
  ],
});
const sealed = (productId: number, name: string): TcgProduct => ({ productId, name, categoryId: 3, groupId: 1, extendedData: [] });

describe("matchGroup", () => {
  const pokemon = [g(1, "SV08: Surging Sparks"), g(2, "SV: Prismatic Evolutions"), g(3, "SV: Scarlet & Violet 151"), g(4, "SV: Scarlet & Violet Promo Cards")];
  it("ignores series prefixes", () => {
    expect(matchGroup("Scarlet & Violet—Surging Sparks", "sv8", pokemon)).toMatchObject({ match: { groupId: 1 } });
    expect(matchGroup("Scarlet & Violet—Prismatic Evolutions", null, pokemon)).toMatchObject({ match: { groupId: 2 } });
    expect(matchGroup("Scarlet & Violet—151", null, pokemon)).toMatchObject({ match: { groupId: 3 } });
  });
  it("doesn't confuse a set with its Commander/supplemental products", () => {
    const mtg = [g(10, "Bloomburrow"), g(11, "Bloomburrow Commander"), g(12, "Duskmourn: House of Horror")];
    expect(matchGroup("Bloomburrow", "blb", mtg)).toMatchObject({ match: { groupId: 10 } });
    expect(matchGroup("Duskmourn: House of Horror", "dsk", mtg)).toMatchObject({ match: { groupId: 12 } });
  });
  it("reports when nothing matches", () => {
    const r = matchGroup("Journey Together", null, pokemon);
    expect(r.match).toBeNull();
  });
});

describe("matchSealedProduct", () => {
  const cat = [
    sealed(100, "Surging Sparks Booster Box"),
    sealed(101, "Surging Sparks Booster Box Case"),
    sealed(102, "Surging Sparks Elite Trainer Box"),
    sealed(103, "Surging Sparks Pokemon Center Elite Trainer Box"),
    card(200, "Pikachu ex - 238/191", "238/191", "Special Illustration Rare"),
  ];
  const sets = ["Scarlet & Violet—Surging Sparks", "SV08: Surging Sparks"];
  it("matches exact names, not cases or exclusive variants", () => {
    expect(matchSealedProduct("Surging Sparks Booster Box", sets, cat)).toMatchObject({ match: { productId: 100 } });
    expect(matchSealedProduct("Surging Sparks Elite Trainer Box", sets, cat)).toMatchObject({ match: { productId: 102 } });
  });
  it("treats Display as Box and ignores set name differences", () => {
    const mtg = [sealed(1, "Duskmourn: House of Horror - Play Booster Display"), sealed(2, "Duskmourn: House of Horror - Collector Booster Display")];
    expect(matchSealedProduct("Duskmourn Play Booster Box", ["Duskmourn: House of Horror"], mtg)).toMatchObject({ match: { productId: 1 } });
  });
  it("handles 151's naming", () => {
    const c = [sealed(5, "Scarlet & Violet 151 Elite Trainer Box"), sealed(6, "Scarlet & Violet 151 Booster Bundle")];
    expect(matchSealedProduct("151 Elite Trainer Box", ["Scarlet & Violet—151", "SV: Scarlet & Violet 151"], c)).toMatchObject({
      match: { productId: 5 },
    });
  });
  it("handles apostrophes", () => {
    const c = [sealed(7, "Azurite Sea Illumineer's Trove"), sealed(8, "Azurite Sea Booster Box")];
    expect(matchSealedProduct("Azurite Sea Illumineer's Trove", ["Azurite Sea"], c)).toMatchObject({ match: { productId: 7 } });
  });
});

describe("matchCard", () => {
  const cat = [
    card(1, "Pikachu ex - 057/191", "057/191", "Double Rare"),
    card(2, "Pikachu ex - 238/191", "238/191", "Special Illustration Rare"),
    card(3, "Pikachu ex - 247/191", "247/191", "Hyper Rare"),
    card(4, "Beza, the Bounding Spring", "2", "Mythic"),
    card(5, "Beza, the Bounding Spring (Borderless)", "300", "Mythic"),
  ];
  it("matches by number", () => expect(matchCard({ name: "Pikachu ex", number: "238", rarity: null, variant: null }, cat)).toMatchObject({ match: { productId: 2 } }));
  it("matches by name + rarity", () =>
    expect(matchCard({ name: "Pikachu ex", number: null, rarity: "Hyper Rare", variant: "Gold" }, cat)).toMatchObject({ match: { productId: 3 } }));
  it("prefers the regular printing over alt arts", () =>
    expect(matchCard({ name: "Beza, the Bounding Spring", number: null, rarity: "Mythic", variant: null }, cat)).toMatchObject({ match: { productId: 4 } }));
  it("is ambiguous without rarity", () => expect(matchCard({ name: "Pikachu ex", number: null, rarity: null, variant: null }, cat).match).toBeNull());
});

describe("cardsForTier", () => {
  const cat = [
    card(1, "Eevee - 074/131", "074/131", "Common"),
    card(2, "Eevee (Master Ball Pattern) - 074/131", "074/131", "Common"),
    card(3, "Umbreon ex - 161/131", "161/131", "Special Illustration Rare"),
    sealed(9, "Prismatic Evolutions Elite Trainer Box"),
  ];
  it("filters by rarity and skips variants", () =>
    expect(cardsForTier({ syncRarities: ["Common"], syncNameContains: null, syncIncludeVariants: false }, cat).map((p) => p.productId)).toEqual([1]));
  it("filters by name", () =>
    expect(cardsForTier({ syncRarities: [], syncNameContains: "Master Ball Pattern", syncIncludeVariants: false }, cat).map((p) => p.productId)).toEqual([2]));
});

describe("rarity codes and accents", () => {
  const mtg = [card(1, "Maha, Its Feathers Night", "100", "M"), card(2, "Fabled Passage", "252", "R")];
  it("maps letter rarities", () => {
    expect(matchCard({ name: "Maha, Its Feathers Night", number: null, rarity: "Mythic", variant: null }, mtg)).toMatchObject({ match: { productId: 1 } });
    expect(cardsForTier({ syncRarities: ["Rare"], syncNameContains: null, syncIncludeVariants: false }, mtg).map((p) => p.productId)).toEqual([2]);
  });
  it("ignores accents in name filters", () => {
    const c = [card(3, "Eevee (Poke Ball Pattern) - 074/131", "074/131", "Common")];
    expect(cardsForTier({ syncRarities: [], syncNameContains: "Poké Ball Pattern", syncIncludeVariants: false }, c)).toHaveLength(1);
  });
});

describe("helpers", () => {
  it("normalises numbers", () => {
    expect(normNumber("007/191")).toBe("7");
    expect(normNumber("TG01/TG30")).toBe("tg01");
  });
  it("splits names", () => expect(splitCardName("Beza (Borderless) - 300")).toEqual({ base: "beza", paren: "borderless" }));
  it("picks prices", () => {
    const rows = [
      { productId: 1, subTypeName: "Normal", marketPrice: 0.1, midPrice: 0.2, lowPrice: null, highPrice: null },
      { productId: 1, subTypeName: "Reverse Holofoil", marketPrice: 0.5, midPrice: null, lowPrice: null, highPrice: null },
    ];
    expect(pickPrice(rows, { finish: "NONFOIL" })).toBe(0.1);
    expect(pickPrice(rows, { subType: "Reverse Holofoil" })).toBe(0.5);
    expect(pickPrice(rows, { subType: "Holofoil" })).toBeNull();
    expect(pickPrice(rows, { subType: "Cold Foil, Reverse Holofoil" })).toBe(0.5);
  });
});
