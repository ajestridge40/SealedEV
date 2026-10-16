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
| **Prices** | Provider interface with TCGCSV (daily TCGplayer mirror, sealed + singles), Scryfall (Magic singles) and pokemontcg.io (Pokémon singles). Daily price snapshots, daily EV snapshots, Vercel Cron. |
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
5. `vercel.json` schedules `/api/cron/refresh-prices` daily at 09:00 UTC. Set `CRON_SECRET` and Vercel sends it as a bearer token.

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

## Data sources & limitations

| Source | Covers | Needs on our side |
| --- | --- | --- |
| [TCGCSV](https://tcgcsv.com) (daily TCGplayer mirror) | Sealed products and singles, all games | `Game.tcgplayerCategoryId` (preset), `Set.tcgplayerGroupId`, `tcgplayerProductId` on the product or card |
| [Scryfall](https://scryfall.com/docs/api) | Magic singles | Set code (seeded). Uses the collector number, or the name for non-variant cards, or `scryfallId` |
| [pokemontcg.io](https://pokemontcg.io) | Pokémon singles | `Card.pokemontcgId`, e.g. `sv8-238` |
| Manual / CSV | Anything | — |

- **The seed data has no TCGplayer ids yet**, so sealed prices won't auto-refresh until you add `tcgplayer_product_id` (CSV import or the admin form) and `tcgplayerGroupId` on the set. The refresh report and the admin data-health panel count what's missing.
- The providers are written to each API's documented response format. They couldn't be run live from the build sandbox (outbound API access was blocked), so check the first refresh report for errors.
- eBay sold listings and Cardmarket aren't wired up. eBay's Marketplace Insights API is restricted and Cardmarket's API needs approval. To add one, implement `ProductPriceProvider`/`CardPriceProvider` in `src/lib/pricing/providers/` and register it in `registry.ts`.
- EV assumes independent packs and equally likely cards within a tier. Real collation (for example, guaranteed hits per box) shifts the variance much more than the mean.

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

**A new set or product.**
- *Admin UI:* use `/admin` → Add product, then add tiers via CSV.
- *CSV:* import in order `tiers` → `cards` → `products`. Examples are built into the import panel:
  ```csv
  game,set,pack_type,tier,per_pack,pool_size,unlisted_value,odds_source,odds_note,odds_url,is_chase
  pokemon,Scarlet & Violet—Surging Sparks,Booster Pack,Special Illustration Rare,1/87,13,15,COMMUNITY,Card Codex,https://cardcodex.com/,yes
  ```
- *Seed file:* add a `SeedSet` to `prisma/seed-data/` (see `types.ts`) and include it in `prisma/seed.ts`. This is best for sets you want in every environment.

**Pull rates.** Edit them inline on the product page (admin), import tier CSVs, or edit the seed files. Always set the source honestly.

## Roadmap / next iterations

- Fill in TCGplayer ids for the seed products so sealed prices refresh automatically.
- Email or push delivery for alerts (`lib/alerts.ts` already builds the messages).
- Magic-link sign-in (Auth.js Email provider).
- More sets and games (One Piece, Yu-Gi-Oh! and Lorcana are already registered as games).
- Variance view: a Monte-Carlo distribution of box outcomes using per-card odds.
- eBay sold-listing provider for sealed prices.
