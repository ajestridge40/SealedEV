import { prisma } from "@/lib/db";
import { mergeLiquidation } from "@/lib/ev";
import { productInclude, summarize } from "@/lib/data/products";
import { money, pct } from "@/lib/format";

const COOLDOWN_MS = 24 * 3_600_000;

/**
 * Check every watched product with an alert set and create an in-app
 * notification when the alert fires:
 *   - market price ≤ alertMaxPrice, or
 *   - ROI (raw or net EV, user's liquidation settings) ≥ alertMinRoi %
 * Each watch fires at most once per 24h.
 */
export async function evaluateAlerts(now = new Date()): Promise<number> {
  const watches = await prisma.userProduct.findMany({
    where: { watching: true, OR: [{ alertMaxPrice: { not: null } }, { alertMinRoi: { not: null } }] },
    include: { user: true, product: { include: productInclude } },
  });

  let fired = 0;
  for (const w of watches) {
    if (w.lastAlertAt && now.getTime() - w.lastAlertAt.getTime() < COOLDOWN_MS) continue;
    const price = w.product.marketPrice;
    if (price == null) continue;

    const s = summarize(w.product, mergeLiquidation(w.user));
    const r = w.alertUseNet ? s.net : s.raw;
    const reasons: string[] = [];
    if (w.alertMaxPrice != null && price <= w.alertMaxPrice) reasons.push(`price ${money(price)} ≤ your target ${money(w.alertMaxPrice)}`);
    if (w.alertMinRoi != null && r.roi != null && r.roi * 100 >= w.alertMinRoi)
      reasons.push(`${w.alertUseNet ? "net" : "raw"} ROI ${pct(r.roi)} ≥ your threshold ${pct(w.alertMinRoi / 100)}`);
    if (!reasons.length) continue;

    await prisma.$transaction([
      prisma.notification.create({
        data: {
          userId: w.userId,
          productId: w.productId,
          title: `${w.product.name}: alert triggered`,
          body: `${reasons.join("; ")}. EV ${money(r.ev)} vs price ${money(price)}.`,
        },
      }),
      prisma.userProduct.update({ where: { id: w.id }, data: { lastAlertAt: now } }),
    ]);
    fired++;
  }
  return fired;
}
