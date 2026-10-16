import Link from "next/link";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserProductsWithEv } from "@/lib/data/user-products";
import { money, pct } from "@/lib/format";
import type { EvMode } from "@/lib/ev";
import { buttonVariants } from "@/components/ui/button";
import { ProductListCard } from "@/components/product-list-card";
import { ModeToggle } from "@/components/mode-toggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Watchlist" };

export default async function WatchlistPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const mode: EvMode = (await searchParams).mode === "net" ? "net" : "raw";
  const user = await requireUser("/watchlist");
  const rows = (await getUserProductsWithEv(user.id, { watching: true })).sort(
    (a, b) => (b.item.summary[mode].diff ?? -Infinity) - (a.item.summary[mode].diff ?? -Infinity),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
          <p className="text-sm text-muted-foreground">{rows.length} watched · best value first</p>
        </div>
        <Link href={`/api/export?list=watchlist&mode=${mode}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Download /> Export CSV
        </Link>
      </div>
      <ModeToggle mode={mode} hrefFor={(m) => (m === "net" ? "/watchlist?mode=net" : "/watchlist")} />
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nothing watched yet. Tap <strong>Watch</strong> on any product in the <Link href="/" className="underline">Value Finder</Link>.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map(({ up, item }) => (
            <ProductListCard
              key={up.id}
              item={item}
              mode={mode}
              tracking={up}
              signedIn
              footer={
                (up.alertMaxPrice != null || up.alertMinRoi != null) && (
                  <span className="text-right text-xs text-muted-foreground">
                    Alert: {[up.alertMaxPrice != null && `≤ ${money(up.alertMaxPrice)}`, up.alertMinRoi != null && `ROI ≥ ${pct(up.alertMinRoi / 100, 0)}`]
                      .filter(Boolean)
                      .join(" or ")}
                  </span>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
