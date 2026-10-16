import { prisma } from "@/lib/db";
import { getAllProductsWithEv, getLiquidationSettings } from "./products";

/** The user's tracked products joined with their EV summaries. */
export async function getUserProductsWithEv(userId: string, where: { watching?: true; ownedQty?: { gt: number } }) {
  const [settings, rows] = await Promise.all([
    getLiquidationSettings(userId),
    prisma.userProduct.findMany({ where: { userId, ...where }, orderBy: { updatedAt: "desc" } }),
  ]);
  const all = await getAllProductsWithEv(settings);
  const byId = new Map(all.map((i) => [i.product.id, i]));
  return rows.flatMap((up) => {
    const item = byId.get(up.productId);
    return item ? [{ up, item }] : [];
  });
}
