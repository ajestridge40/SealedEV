import Link from "next/link";
import { Info } from "lucide-react";
import { currentUser } from "@/lib/session";
import { getAllProductsWithEv, getLiquidationSettings } from "@/lib/data/products";
import { applyFilters, parseFilters } from "@/lib/data/filters";
import { getTrackingMap } from "@/lib/data/tracking";
import { RATING_THRESHOLDS } from "@/lib/ev";
import { ProductListCard } from "@/components/product-list-card";
import { ValueFiltersForm } from "@/components/value-filters";
import { ModeToggle, withParams } from "@/components/mode-toggle";

export const dynamic = "force-dynamic";

export default async function ValueFinderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  const user = await currentUser();
  const [settings, tracking] = await Promise.all([getLiquidationSettings(user?.id), getTrackingMap(user?.id)]);
  const all = await getAllProductsWithEv(settings);
  const items = applyFilters(all, f);

  const plain = Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const activeCount = ["game", "type", "minPrice", "maxPrice", "minRoi", "rating", "released", "q"].filter((k) => plain[k]).length;
  const good = items.filter((i) => i.summary.rating[f.mode] === "GOOD").length;
  const seedCount = all.filter((i) => i.product.priceSource === "SEED_ESTIMATE").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Value Finder</h1>
          <p className="text-sm text-muted-foreground">
            Sealed products ranked by expected value of opening vs. market price. {items.length} shown · {good} rated Good Value.
          </p>
        </div>
        <div className="md:w-80">
          <ModeToggle mode={f.mode} hrefFor={(m) => withParams("/", { ...plain, mode: m === "net" ? "net" : undefined })} />
        </div>
      </div>

      {seedCount > 0 && (
        <div className="flex gap-2 rounded-lg border border-fair/40 bg-fair/10 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>
              {seedCount} of {all.length} products use seed prices
            </strong>{" "}
            (approximate mid-2025 snapshots), and most pull rates are community estimates. Treat those rankings as a demo until prices are
            refreshed or updated. <Link href="/methodology" className="underline">How EV is calculated</Link>.
          </p>
        </div>
      )}

      <ValueFiltersForm f={f} activeCount={activeCount} />

      <p className="text-xs text-muted-foreground">
        Good Value = ROI ≥ {RATING_THRESHOLDS.good * 100}% · Fair = ROI ≥ {RATING_THRESHOLDS.fair * 100}% · Overpriced below that.{" "}
        {f.mode === "net" ? "Net EV subtracts selling fees, shipping and bulk-outs (see Settings)." : "Raw EV uses market prices as-is."}
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No products match these filters.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item, i) => (
            <ProductListCard
              key={item.product.id}
              item={item}
              mode={f.mode}
              rank={i + 1}
              tracking={tracking.get(item.product.id)}
              signedIn={!!user}
            />
          ))}
        </div>
      )}
    </div>
  );
}
