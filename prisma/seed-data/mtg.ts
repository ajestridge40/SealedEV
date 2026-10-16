import type { SeedSet, SeedTier } from "./types";

// Wizards of the Coast publishes collation for each set in its "Collecting
// <Set>" articles. These seeds do NOT copy those numbers, so they're marked
// COMMUNITY/ESTIMATE. Once you've checked a rate against the official
// article, set oddsSource to PUBLISHED and put the article URL in oddsSourceUrl.
// Card prices are approximate mid-2025 market levels (SEED_ESTIMATE).

const BLB_MANA_MATH = "https://blog.mtgprice.com/2024/07/19/the-mana-math-of-bloomburrow/";
const BLB_MTGWTF = "https://www.mtg.wtf/pack/blb-play";

function playBoosterBulk(): SeedTier[] {
  return [
    {
      name: "Common",
      rarity: "Common",
      perPack: 6.5,
      oddsSource: "COMMUNITY",
      oddsSourceNote: "Play Booster: ~6 commons, plus commons from the wildcard/foil slots.",
      poolSize: 81,
      unlistedCardValue: 0.03,
    },
    {
      name: "Uncommon",
      rarity: "Uncommon",
      perPack: 3.5,
      oddsSource: "COMMUNITY",
      oddsSourceNote: "Play Booster: 3 uncommons, plus uncommons from the wildcard/foil slots.",
      poolSize: 100,
      unlistedCardValue: 0.12,
    },
  ];
}

export const mtgSets: SeedSet[] = [
  {
    game: "mtg",
    name: "Bloomburrow",
    code: "blb",
    releaseDate: "2024-08-02",
    packTypes: [
      {
        name: "Play Booster",
        cardsPerPack: 14,
        tiers: [
          ...playBoosterBulk(),
          {
            name: "Rare (rare + wildcard slots)",
            rarity: "Rare",
            perPack: 0.93,
            oddsSource: "COMMUNITY",
            oddsSourceNote:
              "Rare slot is a rare ~6 in 7 packs (retailer/community summaries), plus an estimated share from the wildcard slot.",
            oddsSourceUrl: BLB_MTGWTF,
            poolSize: 60,
            unlistedCardValue: 0.6,
            cards: [
              { name: "Innkeeper's Talent", rarity: "Rare", price: 12 },
              { name: "Valley Questcaller", rarity: "Rare", price: 7 },
              { name: "Fabled Passage", rarity: "Rare", price: 4 },
            ],
          },
          {
            name: "Mythic (rare + wildcard slots)",
            rarity: "Mythic",
            perPack: 0.16,
            oddsSource: "COMMUNITY",
            oddsSourceNote: "Mythic in the rare slot ~1 in 7 packs (community/retailer summaries), plus a small wildcard share.",
            oddsSourceUrl: BLB_MTGWTF,
            poolSize: 20,
            unlistedCardValue: 2,
            isChase: true,
            cards: [
              { name: "Beza, the Bounding Spring", rarity: "Mythic", price: 18 },
              { name: "Maha, Its Feathers Night", rarity: "Mythic", price: 15 },
              { name: "Ygra, Eater of All", rarity: "Mythic", price: 6 },
              { name: "Season of Loss", rarity: "Mythic", price: 4 },
            ],
          },
          {
            name: "Traditional foil rare/mythic",
            rarity: "Rare/Mythic (foil)",
            perPack: 0.07,
            oddsSource: "ESTIMATE",
            oddsSourceNote: "Foil slot can be any rarity; rare/mythic share estimated.",
            poolSize: 80,
            unlistedCardValue: 3,
          },
          {
            name: "Borderless / showcase rare+",
            rarity: "Rare/Mythic (alt art)",
            perPack: 1 / 20,
            oddsSource: "ESTIMATE",
            oddsSourceNote: "Per-card odds for treatments are tabulated in The Mana Math of Bloomburrow; aggregated here as a rough figure.",
            oddsSourceUrl: BLB_MANA_MATH,
            poolSize: 40,
            unlistedCardValue: 5,
          },
          {
            name: "Special Guests",
            rarity: "Special Guest",
            perPack: 0.015,
            oddsSource: "COMMUNITY",
            oddsSourceNote: "~1.5% chance per Play Booster (The Mana Math of Bloomburrow).",
            oddsSourceUrl: BLB_MANA_MATH,
            poolSize: 10,
            unlistedCardValue: 8,
            isChase: true,
          },
        ],
      },
      {
        name: "Collector Booster",
        cardsPerPack: 15,
        notes: "Collector Booster tiers are aggregated and rough. Replace with per-treatment odds from the official collecting article.",
        tiers: [
          {
            name: "Foil commons/uncommons",
            rarity: "Common/Uncommon (foil)",
            perPack: 7,
            oddsSource: "ESTIMATE",
            poolSize: 180,
            unlistedCardValue: 0.15,
          },
          {
            name: "Non-foil alt-art rare/mythic",
            rarity: "Rare/Mythic (alt art)",
            perPack: 2,
            oddsSource: "ESTIMATE",
            poolSize: 80,
            unlistedCardValue: 1.5,
          },
          {
            name: "Foil rare/mythic",
            rarity: "Rare/Mythic (foil)",
            perPack: 1,
            oddsSource: "ESTIMATE",
            poolSize: 80,
            unlistedCardValue: 3,
          },
          {
            name: "Foil borderless/showcase rare+",
            rarity: "Rare/Mythic (foil alt art)",
            perPack: 1,
            oddsSource: "ESTIMATE",
            poolSize: 60,
            unlistedCardValue: 4,
          },
          {
            name: "Chase treatments (raised foil, foil Special Guests, etc.)",
            rarity: "Chase",
            perPack: 0.1,
            oddsSource: "ESTIMATE",
            oddsSourceNote: "Placeholder aggregate; edit with per-treatment odds.",
            poolSize: 30,
            unlistedCardValue: 40,
            isChase: true,
          },
        ],
      },
    ],
    products: [
      {
        name: "Bloomburrow Play Booster Box",
        slug: "mtg-bloomburrow-play-booster-box",
        productType: "PLAY_BOOSTER_BOX",
        msrp: null,
        marketPrice: 145,
        releaseDate: "2024-08-02",
        packs: [{ packType: "Play Booster", count: 36 }],
      },
      {
        name: "Bloomburrow Collector Booster Box",
        slug: "mtg-bloomburrow-collector-booster-box",
        productType: "COLLECTOR_BOOSTER_BOX",
        msrp: null,
        marketPrice: 330,
        releaseDate: "2024-08-02",
        packs: [{ packType: "Collector Booster", count: 12 }],
      },
    ],
  },
  {
    game: "mtg",
    name: "Duskmourn: House of Horror",
    code: "dsk",
    releaseDate: "2024-09-27",
    packTypes: [
      {
        name: "Play Booster",
        cardsPerPack: 14,
        tiers: [
          ...playBoosterBulk(),
          {
            name: "Rare (rare + wildcard slots)",
            rarity: "Rare",
            perPack: 0.93,
            oddsSource: "COMMUNITY",
            oddsSourceNote: "Standard Play Booster structure: rare ~6 in 7 packs in the rare slot, plus an estimated wildcard share.",
            poolSize: 60,
            unlistedCardValue: 0.5,
            cards: [{ name: "Enduring Innocence", rarity: "Rare", price: 5 }],
          },
          {
            name: "Mythic (rare + wildcard slots)",
            rarity: "Mythic",
            perPack: 0.16,
            oddsSource: "COMMUNITY",
            oddsSourceNote: "Standard Play Booster structure: mythic ~1 in 7 packs in the rare slot, plus a small wildcard share.",
            poolSize: 20,
            unlistedCardValue: 2,
            isChase: true,
            cards: [
              { name: "Overlord of the Hauntwoods", rarity: "Mythic", price: 20 },
              { name: "Overlord of the Mistmoors", rarity: "Mythic", price: 15 },
              { name: "Valgavoth, Terror Eater", rarity: "Mythic", price: 8 },
            ],
          },
          {
            name: "Traditional foil rare/mythic",
            rarity: "Rare/Mythic (foil)",
            perPack: 0.07,
            oddsSource: "ESTIMATE",
            poolSize: 80,
            unlistedCardValue: 3,
          },
          {
            name: "Borderless / showcase rare+",
            rarity: "Rare/Mythic (alt art)",
            perPack: 1 / 20,
            oddsSource: "ESTIMATE",
            poolSize: 40,
            unlistedCardValue: 4,
          },
        ],
      },
    ],
    products: [
      {
        name: "Duskmourn Play Booster Box",
        slug: "mtg-duskmourn-play-booster-box",
        productType: "PLAY_BOOSTER_BOX",
        msrp: null,
        marketPrice: 130,
        releaseDate: "2024-09-27",
        packs: [{ packType: "Play Booster", count: 36 }],
      },
    ],
  },
];
