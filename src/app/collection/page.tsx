import Link from "next/link";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getUserProductsWithEv } from "@/lib/data/user-products";
import { money, signedMoney } from "@/lib/format";
import type { EvMode } from "@/lib/ev";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductListCard } from "@/components/product-list-card";
import { ModeToggle } from "@/components/mode-toggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Collection" };

export default async function CollectionPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const mode: EvMode = (await searchParams).mode === "net" ? "net" : "raw";
  const user = await requireUser("/collection");
  const rows = await getUserProductsWithEv(user.id, { ownedQty: { gt: 0 } });

  const marketValue = rows.reduce((s, { up, item }) => s + up.ownedQty * (item.product.marketPrice ?? 0), 0);
  const evValue = rows.reduce((s, { up, item }) => s + up.ownedQty * item.summary[mode].ev, 0);
  const costed = rows.filter(({ up }) => up.costBasis != null);
  const cost = costed.reduce((s, { up }) => s + up.ownedQty * (up.costBasis ?? 0), 0);
  const costedMarket = costed.reduce((s, { up, item }) => s + up.ownedQty * (item.product.marketPrice ?? 0), 0);
  const units = rows.reduce((s, { up }) => s + up.ownedQty, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Collection</h1>
          <p className="text-sm text-muted-foreground">
            {units} sealed item{units === 1 ? "" : "s"} across {rows.length} product{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href={`/api/export?list=collection&mode=${mode}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Download /> Export CSV
        </Link>
      </div>
      <ModeToggle mode={mode} hrefFor={(m) => (m === "net" ? "/collection?mode=net" : "/collection")} />
      <Card className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">Sealed market value</div>
          <div className="text-lg font-bold">{money(marketValue)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">If opened ({mode === "net" ? "net EV" : "EV"})</div>
          <div className="text-lg font-bold">{money(evValue)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Cost basis</div>
          <div className="text-lg font-bold">{costed.length ? money(cost) : "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Unrealised P/L</div>
          <div className={cn("text-lg font-bold", costedMarket - cost >= 0 ? "text-good" : "text-bad")}>
            {costed.length ? signedMoney(costedMarket - cost) : "—"}
          </div>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">
        When market value is above EV, holding or selling sealed is worth more on average than opening. Set cost basis on each product page.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nothing here yet. Tap <strong>Own</strong> on a product in the <Link href="/" className="underline">Value Finder</Link>.
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
                up.costBasis != null && (
                  <span className="text-right text-xs text-muted-foreground">
                    Paid {money(up.costBasis)} · {signedMoney((item.product.marketPrice ?? 0) - up.costBasis)}/unit
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
