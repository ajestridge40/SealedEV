import Link from "next/link";
import type { EvMode } from "@/lib/ev";
import type { ProductListItem } from "@/lib/data/products";
import { ago, money, pct, signedMoney } from "@/lib/format";
import { PRODUCT_TYPE_LABEL } from "@/lib/product-types";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ConfidenceBadge, FreshnessBadge, GameChip, RatingBadge } from "@/components/badges";
import { WatchOwnButtons } from "@/components/watch-own-buttons";

export function ProductListCard({
  item,
  mode,
  rank,
  tracking,
  signedIn,
  footer,
}: {
  item: ProductListItem;
  mode: EvMode;
  rank?: number;
  tracking?: { watching: boolean; ownedQty: number };
  signedIn: boolean;
  footer?: React.ReactNode;
}) {
  const { product: p, summary: s } = item;
  const r = s[mode];
  const positive = (r.diff ?? 0) >= 0;
  const href = `/products/${p.slug}${mode === "net" ? "?mode=net" : ""}`;

  return (
    <Card className="overflow-hidden">
      <Link href={href} className="block p-4 hover:bg-accent/40">
        <div className="flex items-start gap-3">
          {rank != null && <span className="mt-0.5 w-6 shrink-0 text-sm font-semibold text-muted-foreground tabular-nums">#{rank}</span>}
          {p.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageUrl} alt="" loading="lazy" className="size-14 shrink-0 rounded-md bg-muted object-contain" />
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <GameChip slug={p.game.slug} name={p.game.shortName} />
              <span className="text-xs text-muted-foreground">
                {PRODUCT_TYPE_LABEL[p.productType]} · {item.totalPacks} packs
                {item.cardsPerPack ? ` × ${item.cardsPerPack}` : ""}
              </span>
            </div>
            <h3 className="font-semibold leading-snug">{p.name}</h3>
            <p className="truncate text-xs text-muted-foreground">{p.set.name}</p>
          </div>
          <RatingBadge rating={s.rating[mode]} className="shrink-0" />
        </div>

        <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
          <div className="rounded-md bg-muted/60 px-1 py-2">
            <dt className="text-[11px] text-muted-foreground">Price</dt>
            <dd className="text-sm font-semibold tabular-nums">{money(p.marketPrice, { whole: true })}</dd>
          </div>
          <div className="rounded-md bg-muted/60 px-1 py-2">
            <dt className="text-[11px] text-muted-foreground">{mode === "net" ? "Net EV" : "EV"}</dt>
            <dd className="text-sm font-semibold tabular-nums">{money(r.ev, { whole: true })}</dd>
          </div>
          <div className="rounded-md bg-muted/60 px-1 py-2">
            <dt className="text-[11px] text-muted-foreground">EV − Price</dt>
            <dd className={cn("text-sm font-semibold tabular-nums", positive ? "text-good" : "text-bad")}>{signedMoney(r.diff)}</dd>
          </div>
          <div className="rounded-md bg-muted/60 px-1 py-2">
            <dt className="text-[11px] text-muted-foreground">ROI</dt>
            <dd className={cn("text-sm font-semibold tabular-nums", positive ? "text-good" : "text-bad")}>{pct(r.roi, 0)}</dd>
          </div>
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <ConfidenceBadge level={s.confidence.level} title={s.confidence.reasons.join(" · ")} />
          <FreshnessBadge value={s.confidence.productFreshness} title={p.priceSource ?? undefined} />
          <span className="text-xs text-muted-foreground">
            price {ago(p.priceUpdatedAt)}
            {p.priceSource ? ` · ${p.priceSource}` : ""}
          </span>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5">
        <WatchOwnButtons
          productId={p.id}
          watching={tracking?.watching ?? false}
          ownedQty={tracking?.ownedQty ?? 0}
          signedIn={signedIn}
          compact
        />
        {footer}
      </div>
    </Card>
  );
}
