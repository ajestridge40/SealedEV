import Papa from "papaparse";
import { currentUser } from "@/lib/session";
import { getUserProductsWithEv } from "@/lib/data/user-products";
import { getAllProductsWithEv, getLiquidationSettings } from "@/lib/data/products";
import { PRODUCT_TYPE_LABEL } from "@/lib/product-types";

export const dynamic = "force-dynamic";

const r2 = (n: number | null | undefined) => (n == null ? "" : n.toFixed(2));

/** GET /api/export?list=watchlist|collection|all&mode=raw|net → CSV value report */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const list = url.searchParams.get("list") ?? "all";
  const mode = url.searchParams.get("mode") === "net" ? "net" : "raw";
  const user = await currentUser();
  if (list !== "all" && !user) return new Response("Sign in required", { status: 401 });

  const rows =
    list === "all"
      ? (await getAllProductsWithEv(await getLiquidationSettings(user?.id))).map((item) => ({ item, up: null }))
      : await getUserProductsWithEv(user!.id, list === "collection" ? { ownedQty: { gt: 0 } } : { watching: true });

  const csv = Papa.unparse(
    rows.map(({ item, up }) => {
      const r = item.summary[mode];
      return {
        game: item.product.game.name,
        set: item.product.set.name,
        product: item.product.name,
        type: PRODUCT_TYPE_LABEL[item.product.productType],
        packs: item.totalPacks,
        msrp: r2(item.product.msrp),
        market_price: r2(item.product.marketPrice),
        ev_mode: mode,
        ev: r2(r.ev),
        ev_minus_price: r2(r.diff),
        roi_pct: r.roi == null ? "" : (r.roi * 100).toFixed(1),
        rating: item.summary.rating[mode],
        confidence: item.summary.confidence.level,
        price_source: item.product.priceSource ?? "",
        price_updated: item.product.priceUpdatedAt?.toISOString() ?? "",
        ...(up ? { owned_qty: up.ownedQty, cost_basis: r2(up.costBasis), watching: up.watching } : {}),
      };
    }),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sealedev-${list}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
