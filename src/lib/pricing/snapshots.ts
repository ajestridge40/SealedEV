import { prisma } from "@/lib/db";
import { DEFAULT_LIQUIDATION } from "@/lib/ev";
import { productInclude, summarize } from "@/lib/data/products";
import { dayKey } from "@/lib/utils";

/** Set a product's current price and upsert today's snapshot for that source. */
export async function recordProductPrice(productId: string, price: number, source: string, now = new Date()) {
  const day = dayKey(now);
  await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { marketPrice: price, priceSource: source, priceUpdatedAt: now } }),
    prisma.priceSnapshot.upsert({
      where: { productId_source_day: { productId, source, day } },
      create: { productId, price, source, day, capturedAt: now },
      update: { price, capturedAt: now },
    }),
  ]);
}

/** Store today's EV (default liquidation settings) for charting price vs EV. */
export async function recordEvSnapshots(productIds?: string[], now = new Date()) {
  const day = dayKey(now);
  const products = await prisma.product.findMany({
    where: productIds ? { id: { in: productIds } } : undefined,
    include: productInclude,
  });
  for (const p of products) {
    const s = summarize(p, DEFAULT_LIQUIDATION);
    const data = { price: p.marketPrice, evRaw: s.raw.ev, evNet: s.net.ev };
    await prisma.evSnapshot.upsert({
      where: { productId_day: { productId: p.id, day } },
      create: { productId: p.id, day, ...data },
      update: data,
    });
  }
  return products.length;
}
