import { prisma } from "@/lib/db";

/** userId → map of productId → { watching, ownedQty } */
export async function getTrackingMap(userId: string | undefined) {
  const map = new Map<string, { watching: boolean; ownedQty: number }>();
  if (!userId) return map;
  const rows = await prisma.userProduct.findMany({ where: { userId }, select: { productId: true, watching: true, ownedQty: true } });
  for (const r of rows) map.set(r.productId, { watching: r.watching, ownedQty: r.ownedQty });
  return map;
}
