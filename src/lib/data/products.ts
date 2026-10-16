import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  breakEven,
  calculateEv,
  confidence,
  mergeLiquidation,
  rateValue,
  type BreakEven,
  type Confidence,
  type EvProductInput,
  type EvResult,
  type LiquidationSettings,
  type ValueRating,
} from "@/lib/ev";

export const productInclude = {
  game: true,
  set: true,
  extras: true,
  packs: {
    include: {
      packType: {
        include: {
          tiers: {
            orderBy: { sortOrder: "asc" },
            include: { cards: { include: { card: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.ProductInclude;

export type ProductWithEvData = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** Prisma rows → plain EV engine input. */
export function toEvInput(p: ProductWithEvData): EvProductInput {
  return {
    price: p.marketPrice,
    packs: p.packs.map((pp) => ({
      packTypeId: pp.packTypeId,
      name: pp.packType.name,
      count: pp.count,
      cardsPerPack: pp.packType.cardsPerPack,
      tiers: pp.packType.tiers.map((t) => ({
        id: t.id,
        name: t.name,
        perPack: t.perPack,
        poolSize: t.poolSize,
        unlistedCardValue: t.unlistedCardValue,
        oddsSource: t.oddsSource,
        oddsSourceNote: t.oddsSourceNote,
        oddsSourceUrl: t.oddsSourceUrl,
        isChase: t.isChase,
        cards: t.cards.map(({ card }) => ({
          id: card.id,
          name: card.variant ? `${card.name} (${card.variant})` : card.name,
          number: card.number,
          price: card.marketPrice,
          priceUpdatedAt: card.priceUpdatedAt,
        })),
      })),
    })),
    extras: p.extras.map((e) => ({ name: e.name, value: e.value, liquidate: e.liquidate })),
  };
}

export interface ProductEvSummary {
  raw: EvResult;
  net: EvResult;
  rating: { raw: ValueRating; net: ValueRating };
  confidence: Confidence;
  breakEven: { raw: BreakEven | null; net: BreakEven | null };
}

export function summarize(p: ProductWithEvData, settings: LiquidationSettings): ProductEvSummary {
  const input = toEvInput(p);
  const raw = calculateEv(input, "raw", settings);
  const net = calculateEv(input, "net", settings);
  const cards = p.packs.flatMap((pp) => pp.packType.tiers.flatMap((t) => t.cards.map((c) => c.card)));
  return {
    raw,
    net,
    rating: { raw: rateValue(raw.roi), net: rateValue(net.roi) },
    confidence: confidence(raw, {
      productPriceAt: p.priceUpdatedAt,
      productPriceSource: p.priceSource,
      cardPrices: cards.filter((c) => c.marketPrice != null).map((c) => ({ at: c.priceUpdatedAt, source: c.priceSource })),
    }),
    breakEven: { raw: breakEven(raw), net: breakEven(net) },
  };
}

export const getLiquidationSettings = cache(async (userId: string | null | undefined) => {
  if (!userId) return mergeLiquidation(null);
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { feePct: true, perCardCost: true, sellThreshold: true, bulkValue: true },
  });
  return mergeLiquidation(u);
});

export type ProductListItem = {
  product: ProductWithEvData;
  totalPacks: number;
  cardsPerPack: number | null;
  summary: ProductEvSummary;
};

export const getAllProductsWithEv = cache(async (settings: LiquidationSettings): Promise<ProductListItem[]> => {
  const products = await prisma.product.findMany({ include: productInclude });
  return products.map((p) => {
    const cpp = new Set(p.packs.map((pp) => pp.packType.cardsPerPack));
    return {
      product: p,
      totalPacks: p.packs.reduce((s, pp) => s + pp.count, 0),
      cardsPerPack: cpp.size === 1 ? [...cpp][0] : null,
      summary: summarize(p, settings),
    };
  });
});

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({ where: { slug }, include: productInclude });
}
