import type { SeedSet } from "./types";

// Ravensburger hasn't published per-rarity odds (as far as we know). The pack
// layout (6 common, 3 uncommon, 2 rare-or-higher, 1 foil of any rarity
// including Enchanted) is widely documented; the split between rare,
// super rare and legendary, and the Enchanted rate, are estimates.

const LAYOUT_NOTE = "12-card pack: 6 common, 3 uncommon, 2 rare-or-higher, 1 foil (any rarity, incl. Enchanted).";

export const lorcanaSets: SeedSet[] = [
  {
    game: "lorcana",
    name: "Azurite Sea",
    code: "6",
    releaseDate: "2024-11-15",
    packTypes: [
      {
        name: "Booster Pack",
        cardsPerPack: 12,
        tiers: [
          { name: "Common", rarity: "Common", perPack: 6, oddsSource: "COMMUNITY", oddsSourceNote: LAYOUT_NOTE, poolSize: 72, unlistedCardValue: 0.03 },
          { name: "Uncommon", rarity: "Uncommon", perPack: 3, oddsSource: "COMMUNITY", oddsSourceNote: LAYOUT_NOTE, poolSize: 54, unlistedCardValue: 0.06 },
          {
            name: "Rare",
            rarity: "Rare",
            perPack: 1.4,
            oddsSource: "ESTIMATE",
            oddsSourceNote: "Share of the 2 rare-or-higher slots; estimated.",
            poolSize: 48,
            unlistedCardValue: 0.2,
          },
          {
            name: "Super Rare",
            rarity: "Super Rare",
            perPack: 0.45,
            oddsSource: "ESTIMATE",
            poolSize: 18,
            unlistedCardValue: 0.8,
          },
          {
            name: "Legendary",
            rarity: "Legendary",
            perPack: 0.15,
            oddsSource: "ESTIMATE",
            poolSize: 12,
            unlistedCardValue: 4,
          },
          {
            name: "Foil (non-Enchanted)",
            rarity: "Foil",
            perPack: 1 - 1 / 96,
            oddsSource: "COMMUNITY",
            oddsSourceNote: LAYOUT_NOTE,
            poolSize: 204,
            unlistedCardValue: 0.5,
          },
          {
            name: "Enchanted",
            rarity: "Enchanted",
            perPack: 1 / 96,
            oddsSource: "ESTIMATE",
            oddsSourceNote:
              "No published rate found; ~1 in 96 packs (~1 per 4 boxes) is a commonly repeated community figure. 18 Enchanted cards in the set.",
            oddsSourceUrl: "https://wiki.mushureport.com/wiki/Azurite_Sea_Booster",
            poolSize: 18,
            unlistedCardValue: 70,
            isChase: true,
          },
        ],
      },
    ],
    products: [
      {
        name: "Azurite Sea Booster Box",
        slug: "lorcana-azurite-sea-booster-box",
        productType: "BOOSTER_BOX",
        msrp: 143.76,
        marketPrice: 125,
        releaseDate: "2024-11-15",
        packs: [{ packType: "Booster Pack", count: 24 }],
      },
      {
        name: "Azurite Sea Illumineer's Trove",
        slug: "lorcana-azurite-sea-illumineers-trove",
        productType: "BUNDLE",
        msrp: 49.99,
        marketPrice: 45,
        releaseDate: "2024-11-15",
        packs: [{ packType: "Booster Pack", count: 8 }],
        extras: [{ name: "Dice, card dividers, storage box", value: 0, liquidate: false, note: "Not counted toward EV" }],
      },
    ],
  },
];
