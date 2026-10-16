import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { GAMES } from "../src/lib/games";
import { cardKey } from "../src/lib/catalog/card-key";
import { SEED_PRICE_DATE, type SeedSet } from "./seed-data/types";
import { pokemonSets } from "./seed-data/pokemon";
import { mtgSets } from "./seed-data/mtg";
import { lorcanaSets } from "./seed-data/lorcana";

const prisma = new PrismaClient();
const PRICE_SOURCE = "SEED_ESTIMATE";
const ALL_SETS: SeedSet[] = [...pokemonSets, ...mtgSets, ...lorcanaSets];

async function seedGames() {
  for (const [i, g] of GAMES.entries()) {
    await prisma.game.upsert({
      where: { slug: g.slug },
      create: { slug: g.slug, name: g.name, shortName: g.shortName, tcgplayerCategoryId: g.tcgplayerCategoryId, sortOrder: i },
      update: { name: g.name, shortName: g.shortName, tcgplayerCategoryId: g.tcgplayerCategoryId, sortOrder: i },
    });
  }
}

async function seedSet(s: SeedSet) {
  const game = await prisma.game.findUniqueOrThrow({ where: { slug: s.game } });
  const set = await prisma.set.upsert({
    where: { gameId_name: { gameId: game.id, name: s.name } },
    create: { gameId: game.id, name: s.name, code: s.code, releaseDate: new Date(s.releaseDate) },
    update: { code: s.code, releaseDate: new Date(s.releaseDate) },
  });

  const packTypeIds = new Map<string, string>();
  for (const pt of s.packTypes) {
    const packType = await prisma.packType.upsert({
      where: { setId_name: { setId: set.id, name: pt.name } },
      create: { setId: set.id, name: pt.name, cardsPerPack: pt.cardsPerPack, notes: pt.notes },
      update: { cardsPerPack: pt.cardsPerPack, notes: pt.notes },
    });
    packTypeIds.set(pt.name, packType.id);

    for (const [i, t] of pt.tiers.entries()) {
      const data = {
        rarity: t.rarity,
        perPack: t.perPack,
        oddsSource: t.oddsSource,
        oddsSourceNote: t.oddsSourceNote ?? null,
        oddsSourceUrl: t.oddsSourceUrl ?? null,
        poolSize: t.poolSize,
        unlistedCardValue: t.unlistedCardValue,
        isChase: t.isChase ?? false,
        sortOrder: i,
      };
      const tier = await prisma.pullTier.upsert({
        where: { packTypeId_name: { packTypeId: packType.id, name: t.name } },
        create: { packTypeId: packType.id, name: t.name, ...data },
        update: data,
      });

      for (const c of t.cards ?? []) {
        const key = cardKey(c);
        const card = await prisma.card.upsert({
          where: { setId_key: { setId: set.id, key } },
          create: {
            setId: set.id,
            key,
            name: c.name,
            number: c.number,
            rarity: c.rarity,
            finish: c.finish ?? "NONFOIL",
            variant: c.variant,
            marketPrice: c.price,
            priceSource: PRICE_SOURCE,
            priceUpdatedAt: SEED_PRICE_DATE,
          },
          // Don't clobber prices that a refresh/manual edit has since replaced.
          update: { rarity: c.rarity },
        });
        await prisma.tierCard.upsert({
          where: { tierId_cardId: { tierId: tier.id, cardId: card.id } },
          create: { tierId: tier.id, cardId: card.id },
          update: {},
        });
      }
    }
  }

  for (const p of s.products) {
    const base = {
      name: p.name,
      gameId: game.id,
      setId: set.id,
      productType: p.productType,
      msrp: p.msrp,
      releaseDate: p.releaseDate ? new Date(p.releaseDate) : null,
      notes: p.notes,
    };
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    const product = existing
      ? await prisma.product.update({ where: { id: existing.id }, data: base })
      : await prisma.product.create({
          data: {
            ...base,
            slug: p.slug,
            marketPrice: p.marketPrice,
            priceSource: p.marketPrice != null ? PRICE_SOURCE : null,
            priceUpdatedAt: p.marketPrice != null ? SEED_PRICE_DATE : null,
          },
        });

    if (!existing && p.marketPrice != null) {
      await prisma.priceSnapshot.create({
        data: { productId: product.id, price: p.marketPrice, source: PRICE_SOURCE, day: SEED_PRICE_DATE, capturedAt: SEED_PRICE_DATE },
      });
    }

    await prisma.productPack.deleteMany({ where: { productId: product.id } });
    await prisma.productPack.createMany({
      data: p.packs.map((pk) => {
        const packTypeId = packTypeIds.get(pk.packType);
        if (!packTypeId) throw new Error(`${p.slug}: unknown pack type "${pk.packType}"`);
        return { productId: product.id, packTypeId, count: pk.count };
      }),
    });
    await prisma.productExtra.deleteMany({ where: { productId: product.id } });
    if (p.extras?.length) {
      await prisma.productExtra.createMany({
        data: p.extras.map((e) => ({ productId: product.id, name: e.name, value: e.value, liquidate: e.liquidate ?? true, note: e.note })),
      });
    }
  }
}

async function seedUser() {
  const email = process.env.SEED_USER_EMAIL?.toLowerCase();
  const password = process.env.SEED_USER_PASSWORD;
  if (!email || !password) return;
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash: await bcrypt.hash(password, 10) },
    update: {},
  });
  console.log(`  user ${email} ready`);
}

async function main() {
  console.log("Seeding games…");
  await seedGames();
  for (const s of ALL_SETS) {
    console.log(`Seeding ${s.game} / ${s.name}…`);
    await seedSet(s);
  }
  await seedUser();
  const count = await prisma.product.count();
  console.log(`Done. ${count} products in database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
