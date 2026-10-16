# SealedEV

**Is this booster box worth opening?** SealedEV tracks market prices of sealed trading card products (booster boxes, ETBs, collector boxes, bundles…) and calculates the **Expected Value (EV)** of opening each one from pull rates and single-card prices. Products are ranked by `EV − Price`, so the rare box that's underpriced relative to its pulls rises to the top and the overpriced ones are obvious.

Built mobile-first with Next.js (App Router) · TypeScript · Tailwind v4 · shadcn/ui-style components · PostgreSQL + Prisma · Auth.js.

> ⚠️ **About the seed data.** The 10 seeded products are real products, but their prices are **approximate mid-2025 snapshots** (tagged `SEED_ESTIMATE`). Their pull rates are **community estimates or rough estimates**: no publisher odds are claimed. The UI marks all of it as stale and low-confidence until you refresh or update prices.

---

## Features

| Area | What's there |
| --- | --- |
| **Value Finder** (`/`) | Products ranked by EV − Price (or ROI, EV, price, release). Filters for game, product type, price range, minimum ROI, rating and release window. Good Value / Fair / Overpriced badges. Raw vs. net EV toggle. Confidence and freshness badges. |
| **Product page** | Price, EV, EV − Price and ROI. The full formula with real numbers. A per-tier breakdown (odds, average card value, EV per pack, share of EV, chance of at least one hit). Listed chase cards with price source and age. Odds source badges with links. Break-even analysis. Price vs. EV history chart. |
| **EV engine** (`src/lib/ev`) | Pure, unit-tested functions: tier averaging, raw/net (liquidation) EV, ROI, ratings, break-even (Poisson), confidence score, freshness. |
| **Users** | Email/password auth (Auth.js credentials + bcrypt). Watchlist, My Collection (quantity, cost basis, P/L), price and ROI alerts (in-app), personal net-EV assumptions, CSV export. |
| **Admin** (`/admin`) | Data-health overview, manual price refresh, add product, CSV bulk import (products / pull tiers / cards), inline edits of product prices, card prices and tiers on product pages. |
| **Prices** | Once a day, prices for every sealed product and card come from [TCGCSV](https://tcgcsv.com), a free mirror of TCGplayer's catalogue and prices. **TCGplayer IDs are found automatically**: sets, products and cards are matched by name, and synced tiers pull in every card of their rarity. Scryfall and pokemontcg.io fill gaps. Daily price and EV snapshots run on Vercel Cron. |
| **UX** | Bottom tab bar on phones, no-JS filter form (state lives in the URL, so it's shareable), dark mode. |

## Quick start

```bash
# 1. Postgres (or use a Neon / Supabase URL)
docker compose up -d

# 2. Install + configure
npm install
cp .env.example .env          # then edit AUTH_SECRET (npx auth secret) and ADMIN_EMAILS

# 3. Create tables + seed
npx prisma migrate deploy
npm run db:seed

# 4. Run
npm run dev                   # http://localhost:3000
```

Register with an email listed in `ADMIN_EMAILS` to get the admin tools. To create a user during seeding, set `SEED_USER_EMAIL` and `SEED_USER_PASSWORD` before `npm run db:seed`.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection string (the pooled URL on Neon). |
| `DIRECT_URL` | ✅ | Direct (non-pooled) URL used by migrations. Same as `DATABASE_URL` locally. |
| `AUTH_SECRET` | ✅ | Auth.js secret: `npx auth secret` or `openssl rand -base64 32`. |
| `ADMIN_EMAILS` | ➖ | Comma-separated emails with admin rights. |
| `CRON_SECRET` | ➖ | Protects `/api/cron/refresh-prices`. Vercel Cron sends it automatically. |
| `ENABLE_TCGCSV` | ➖ | `0` disables the TCGCSV provider (default on). |
| `ENABLE_SCRYFALL` | ➖ | `0` disables Scryfall (default on). |
| `POKEMONTCG_API_KEY` | ➖ | Optional. Raises pokemontcg.io rate limits. |

### Scripts

| Script | Does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | EV engine unit tests (Vitest) |
| `npm run typecheck` / `lint` | `tsc` / ESLint |
| `npm run db:migrate` | Create a new migration after editing `schema.prisma` |
| `npm run db:seed` | Upsert games from `src/lib/games.ts` and seed sets/products (idempotent; won't overwrite refreshed prices) |
| `npm run prices:refresh` | Run the price refresh job from the CLI and print a report |

## Deploying (Vercel + Neon)

1. Create a Neon (or Supabase) database. Copy the **pooled** URL to `DATABASE_URL` and the **direct** URL to `DIRECT_URL`.
2. Import the repo in Vercel and set the env vars above.
3. The `vercel-build` script runs `prisma generate && prisma migrate deploy && next build`.
4. Seed once from your machine: `DATABASE_URL=... DIRECT_URL=... npm run db:seed`.
5. `vercel.json` schedules `/api/cron/refresh-prices` daily at 21:30 UTC, shortly after TCGCSV publishes (~20:00 UTC). Set `CRON_SECRET` and Vercel sends it as a bearer token. Run it once by hand from Admin → "Refresh prices now" after seeding.

## How EV is calculated

Full write-up in the app at `/methodology`. Code: `src/lib/ev/calculate.ts`.

```
avgTierValue = ( Σ v(price of each priced listed card)
               + (poolSize − pricedCount) × v(unlistedCardValue) ) / poolSize
tierEV/pack  = perPack × avgTierValue
EV/pack      = Σ tiers tierEV/pack
Product EV   = Σ packTypes (count × EV/pack) + Σ extras
ROI          = (EV − Price) / Price
```

- **Tiers**: each pack type is split into pull tiers ("Special Illustration Rare", "Mythic (rare + wildcard slots)", …). A tier has an expected count per pack, a pool size, the cards you list (usually the chase cards) and an assumed value for every other card in the pool. You don't need to price every common to get a sensible EV, and the assumption shows up in the formula.
- **Raw vs. net**: `v()` is identity in raw mode. In net mode, cards under the sell threshold are bulked; others are worth `price × (1 − fees) − perCardCost`. Defaults are 13% fees, $1/card, a $2 threshold and 1¢ bulk. Users can override them in Settings. Grading is deliberately not modelled.
- **Ratings**: Good Value at ROI ≥ +10%, Fair at ≥ −15%, Overpriced below. Thresholds are in `src/lib/ev/rating.ts`.
- **Break-even**: `chasesNeeded = (price − nonChaseEV) / avgChaseValue`, with a Poisson estimate of the chance of hitting that many.
- **Confidence**: 40% odds quality (published > community > estimate, weighted by EV) + 30% price coverage (real prices vs. assumed values) + 30% freshness. Seed and demo prices never count as fresh.

### Odds labelling

Every tier carries `oddsSource`:

- `PUBLISHED`: printed by the manufacturer. Requires `oddsSourceUrl` (enforced by the admin form and the CSV import).
- `COMMUNITY`: from public large-sample openings or trackers. Cite them in the note or URL.
- `ESTIMATE`: a rough placeholder. Replace it when better data exists.

The Pokémon Company, Ravensburger and Bandai don't publish per-rarity odds, so those sets will always rely on community data. Wizards of the Coast publishes collation in its "Collecting \<Set\>" articles. Once you've checked an MTG tier against that article, switch it to `PUBLISHED` and add the link.

## Daily prices (TCGCSV + automatic TCGplayer IDs)

[TCGCSV](https://tcgcsv.com) republishes TCGplayer's full catalogue and prices for every game once a day (~20:00 UTC). It's free and needs no API key. The daily job (`src/lib/pricing/refresh.ts`) runs in this order:

1. **Auto-link** (`src/lib/pricing/tcgcsv/link.ts`). Fills in missing TCGplayer IDs:
   - **sets → groups** by name. "Scarlet & Violet—Surging Sparks" matches "SV08: Surging Sparks", and "Bloomburrow" doesn't match "Bloomburrow Commander".
   - **sealed products** by name within that group. "Display" is treated as "Box". Cases and Pokémon Center exclusives don't match a plain box or ETB. The product image is saved too.
   - **hand-listed cards** by collector number, or by name + rarity. The regular printing wins over "(Borderless)"-style variants.
   - **synced tiers**: a tier with `syncRarities` (or `syncNameContains`) gets *every* card of that rarity in the set, priced from the chosen sub-type (e.g. `Reverse Holofoil`). Its `poolSize` follows TCGplayer, so EV uses real prices for the whole pool instead of "unlisted card" assumptions.
2. **Prices** for every linked product and card, saved as daily snapshots.
3. **EV snapshots** for the price-vs-EV chart, then **alerts**.

Matching is deliberately strict. Anything ambiguous is skipped and listed under Admin → Refresh → "items need a manual TCGplayer id or tier fix", with candidate names and IDs. You can then:
- set the product or set ID on the product page (admin section). The product ID is the number in `tcgplayer.com/product/<id>`.
- fix a tier's sync rarities, or import them by CSV. When a tier finds no cards, the report lists the rarity names TCGplayer actually uses in that set.

IDs you set by hand are never overwritten.

**Verify on the first run.** The matching rules are unit-tested against TCGplayer-shaped fixtures, and the whole job was integration-tested with a fake TCGCSV. The build sandbox couldn't reach tcgcsv.com, though, so check the first real refresh report. Rarity and sub-type names in particular (e.g. Lorcana's foil sub-type) may need a tweak, which the report points out.

Other sources: Scryfall (Magic) and pokemontcg.io (Pokémon) price any card TCGCSV didn't. eBay sold listings and Cardmarket aren't wired up: eBay's Marketplace Insights API is restricted, and Cardmarket's API needs approval. To add a source, implement `ProductPriceProvider`/`CardPriceProvider` in `src/lib/pricing/providers/` and register it in `registry.ts`.

EV still assumes independent packs and equally likely cards within a tier. Real collation (e.g. guaranteed hits per box) affects the variance much more than the mean.

## Project structure

```
prisma/
  schema.prisma            data model (diagram in header comment)
  migrations/              SQL migrations
  seed.ts                  idempotent seeder
  seed-data/               declarative seed sets: pokemon.ts, mtg.ts, lorcana.ts
src/
  lib/ev/                  ← EV engine (pure functions + tests). Start here to audit the math.
  lib/data/                Prisma → EV input mapping, list/filter/sort, user joins
  lib/pricing/             provider interface, providers/, refresh job, snapshots
  lib/catalog/             CSV import, card identity
  lib/alerts.ts            watchlist alert evaluation
  lib/games.ts             supported games registry
  app/                     routes (App Router), server actions in app/actions/
  components/              UI (components/ui = shadcn-style primitives)
scripts/refresh-prices.ts  CLI price refresh
```

### Data model

```
Game ─< Set ─< PackType ─< PullTier >─< Card          (TierCard join)
              │
Product ─< ProductPack (count × PackType)   ─< ProductExtra (promos etc.)
Product ─< PriceSnapshot (daily, per source)   ─< EvSnapshot (daily EV)
User ─< UserProduct (watching, ownedQty, costBasis, alert thresholds) ─< Notification
```

Pack types are shared between products. A booster box and an ETB of the same set point at the same "Booster Pack", so updating one card price or one pull rate updates every product that contains that pack.

## Adding things

**A new game.** Append it to `GAMES` in `src/lib/games.ts` (with its TCGplayer category id), then run `npm run db:seed`. Flesh and Blood is category 62 and Digimon is 63.

**A new set or product.** For automatic prices, use the exact set and product names TCGplayer uses (or set the IDs by hand), and give each tier `syncRarities`.
- *Admin UI:* use `/admin` → Add product, then add tiers via CSV.
- *CSV:* import in order `tiers` → `cards` → `products`. Examples are built into the import panel:
  ```csv
  game,set,pack_type,tier,per_pack,pool_size,unlisted_value,odds_source,odds_note,odds_url,is_chase,sync_rarities,sync_subtype
  pokemon,Scarlet & Violet—Surging Sparks,Booster Pack,Special Illustration Rare,1/87,13,15,COMMUNITY,Card Codex,https://cardcodex.com/,yes,Special Illustration Rare,
  ```
- *Seed file:* add a `SeedSet` to `prisma/seed-data/` (see `types.ts`) and include it in `prisma/seed.ts`. This is best for sets you want in every environment.

**Pull rates.** Edit them inline on the product page (admin), import tier CSVs, or edit the seed files. Always set the source honestly.

## Roadmap / next iterations

- Check the first live refresh report and fix any unmatched IDs or tier rarity names.
- Email or push delivery for alerts (`lib/alerts.ts` already builds the messages).
- Magic-link sign-in (Auth.js Email provider).
- More sets and games (One Piece, Yu-Gi-Oh! and Lorcana are already registered as games).
- Variance view: a Monte-Carlo distribution of box outcomes using per-card odds.
- eBay sold-listing provider for sealed prices.
