import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { getLiquidationSettings, getProductBySlug, summarize } from "@/lib/data/products";
import { ago, date, money, odds, pct, plainPct, signedMoney } from "@/lib/format";
import { PRODUCT_TYPE_LABEL } from "@/lib/product-types";
import { freshness, type EvMode } from "@/lib/ev";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfidenceBadge, FreshnessBadge, GameChip, OddsSourceBadge, RatingBadge } from "@/components/badges";
import { ModeToggle } from "@/components/mode-toggle";
import { PriceChart, type ChartPoint } from "@/components/price-chart";
import { TrackingForm } from "@/components/tracking-form";
import { WatchOwnButtons } from "@/components/watch-own-buttons";
import { CardPriceForm, ProductPriceForm, TierForm } from "@/components/admin-forms";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ mode?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.product.findUnique({ where: { slug }, select: { name: true } });
  return { title: p?.name ?? "Product" };
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-bold tabular-nums", tone === "good" && "text-good", tone === "bad" && "text-bad")}>{value}</div>
    </div>
  );
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const mode: EvMode = (await searchParams).mode === "net" ? "net" : "raw";
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const user = await currentUser();
  const settings = await getLiquidationSettings(user?.id);
  const s = summarize(product, settings);
  const r = s[mode];
  const be = s.breakEven[mode];
  const tone = (n: number | null) => (n == null ? undefined : n >= 0 ? "good" : "bad");

  const [tracking, priceSnaps, evSnaps] = await Promise.all([
    user ? prisma.userProduct.findUnique({ where: { userId_productId: { userId: user.id, productId: product.id } } }) : null,
    prisma.priceSnapshot.findMany({ where: { productId: product.id }, orderBy: { day: "asc" } }),
    prisma.evSnapshot.findMany({ where: { productId: product.id }, orderBy: { day: "asc" } }),
  ]);

  // Merge price + EV snapshots by day for the chart (latest source per day wins).
  const byDay = new Map<string, ChartPoint>();
  for (const ps of priceSnaps) {
    const day = ps.day.toISOString().slice(0, 10);
    byDay.set(day, { ...byDay.get(day), day, price: ps.price });
  }
  for (const es of evSnaps) {
    const day = es.day.toISOString().slice(0, 10);
    byDay.set(day, { ...byDay.get(day), day, ev: +(mode === "net" ? es.evNet : es.evRaw).toFixed(2) });
  }
  const chart = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));

  const pricePerPack = product.marketPrice != null && r.totalPacks > 0 ? product.marketPrice / r.totalPacks : null;
  const evPerPack = r.totalPacks > 0 ? r.packsEv / r.totalPacks : 0;
  const allTiers = r.packs.flatMap((p) => p.tiers);
  const tierById = new Map(product.packs.flatMap((pp) => pp.packType.tiers).map((t) => [t.id, t]));
  const modeHref = (m: EvMode) => `/products/${slug}${m === "net" ? "?mode=net" : ""}`;

  return (
    <div className="space-y-4">
      <Link href={mode === "net" ? "/?mode=net" : "/"} className="text-sm text-muted-foreground hover:text-foreground">
        ← Value Finder
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <GameChip slug={product.game.slug} name={product.game.shortName} />
          <span className="text-xs text-muted-foreground">
            {PRODUCT_TYPE_LABEL[product.productType]} · {product.set.name}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <RatingBadge rating={s.rating[mode]} />
          <ConfidenceBadge level={s.confidence.level} />
          <FreshnessBadge value={s.confidence.productFreshness} />
          <span className="text-xs text-muted-foreground">
            Released {date(product.releaseDate)} · MSRP {money(product.msrp)}
          </span>
        </div>
      </div>

      <ModeToggle mode={mode} hrefFor={modeHref} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Market price" value={money(product.marketPrice)} />
        <Stat label={mode === "net" ? "Net EV" : "Expected value"} value={money(r.ev)} />
        <Stat label="EV − Price" value={signedMoney(r.diff)} tone={tone(r.diff)} />
        <Stat label="ROI" value={pct(r.roi)} tone={tone(r.roi)} />
      </div>

      <WatchOwnButtons productId={product.id} watching={tracking?.watching ?? false} ownedQty={tracking?.ownedQty ?? 0} signedIn={!!user} />

      {/* Formula */}
      <Card>
        <CardHeader>
          <CardTitle>How this EV is calculated</CardTitle>
          <CardDescription>
            {mode === "raw"
              ? "Raw EV values every card at its market price."
              : `Net EV: cards ≥ ${money(settings.sellThreshold)} sold at market − ${plainPct(settings.feePct)} fees − ${money(settings.perCardCost)}/card; cheaper cards bulked at ${money(settings.bulkValue)}.`}{" "}
            <Link href="/methodology" className="underline">
              Full methodology
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs sm:text-sm">
          {r.packs.map((p) => (
            <p key={p.packTypeId}>
              {p.name}: {p.count} packs × {money(p.evPerPack)} EV/pack = <strong>{money(p.evTotal)}</strong>
            </p>
          ))}
          {r.extras.length > 0 && (
            <p>
              Extras: {r.extras.map((e) => `${e.name} ${money(e.value)}`).join(" + ")} = <strong>{money(r.extrasEv)}</strong>
            </p>
          )}
          <p className="border-t pt-2">
            EV = <strong>{money(r.ev)}</strong> · Price {money(product.marketPrice)} · ROI = (EV − Price) / Price = <strong>{pct(r.roi)}</strong>
          </p>
          {pricePerPack != null && (
            <p className="text-muted-foreground">
              Per pack: you pay {money(pricePerPack)}, expect {money(evPerPack)} in cards.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tier breakdown */}
      {r.packs.map((pack) => (
        <Card key={pack.packTypeId}>
          <CardHeader>
            <CardTitle>
              {pack.name} breakdown <span className="font-normal text-muted-foreground">× {pack.count}</span>
            </CardTitle>
            <CardDescription>Tier EV/pack = expected cards per pack × average card value. Tap a tier for its cards and sources.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pack.tiers.map((t) => {
              const share = r.ev > 0 ? t.evTotal / r.ev : 0;
              const dbTier = tierById.get(t.tierId)!;
              return (
                <details key={t.tierId} className="group rounded-lg border">
                  <summary className="flex cursor-pointer list-none flex-col gap-1 p-3 [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {t.name}
                        {t.isChase && <span className="ml-1.5 text-xs text-fair">★ chase</span>}
                      </span>
                      <span className="font-semibold tabular-nums">{money(t.evTotal)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{odds(t.perPack)}</span>
                      <span>avg {money(t.avgCardValue)}</span>
                      <span>{money(t.evPerPack)}/pack</span>
                      <span>{plainPct(share, 0)} of EV</span>
                      {t.perPack < 1 && <span>{plainPct(t.probAtLeastOne, 0)} chance of ≥1</span>}
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-good" style={{ width: `${Math.min(100, share * 100)}%` }} />
                    </div>
                  </summary>
                  <div className="space-y-3 border-t p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <OddsSourceBadge source={t.oddsSource} />
                      {t.oddsSourceUrl && (
                        <a href={t.oddsSourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline">
                          source <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                    {t.oddsSourceNote && <p className="text-xs text-muted-foreground">{t.oddsSourceNote}</p>}
                    <p className="font-mono text-xs">
                      avg = (Σ {t.pricedCount} priced cards + {t.poolSize - t.pricedCount} × {money(dbTier.unlistedCardValue)} assumed) / {t.poolSize} ={" "}
                      {money(t.avgCardValue)}
                      <br />
                      expected in product = {pack.count} × {t.perPack.toFixed(4)} = {t.expectedCount.toFixed(2)}
                    </p>
                    {dbTier.cards.length > 0 && (
                      <ul className="divide-y rounded-md border">
                        {dbTier.cards
                          .map((tc) => tc.card)
                          .sort((a, b) => (b.marketPrice ?? 0) - (a.marketPrice ?? 0))
                          .map((c) => (
                            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                              <div className="min-w-0">
                                <div className="truncate">
                                  {c.name}
                                  {c.variant && <span className="text-muted-foreground"> ({c.variant})</span>}
                                  {c.number && <span className="text-muted-foreground"> #{c.number}</span>}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <FreshnessBadge value={freshness(c.priceUpdatedAt, c.priceSource)} />
                                  {c.priceSource ?? "no source"} · {ago(c.priceUpdatedAt)}
                                </div>
                              </div>
                              {user?.isAdmin ? (
                                <CardPriceForm cardId={c.id} price={c.marketPrice} />
                              ) : (
                                <span className="font-semibold tabular-nums">{money(c.marketPrice)}</span>
                              )}
                            </li>
                          ))}
                      </ul>
                    )}
                    {user?.isAdmin && (
                      <details className="rounded-md bg-muted/50 p-3">
                        <summary className="cursor-pointer text-xs font-medium">Edit tier (admin)</summary>
                        <div className="pt-3">
                          <TierForm tier={dbTier} />
                        </div>
                      </details>
                    )}
                  </div>
                </details>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Break-even */}
      {be && (
        <Card>
          <CardHeader>
            <CardTitle>Break-even analysis</CardTitle>
            <CardDescription>How many chase cards (★ tiers) you need to pull to get your money back.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Non-chase EV" value={money(be.baseEv)} />
              <Stat label="Avg chase value" value={money(be.avgChaseValue)} />
              <Stat label="Chases expected" value={be.expectedChases.toFixed(2)} />
              <Stat label="Chases needed" value={be.chasesNeeded == null ? "—" : be.chasesNeeded.toFixed(2)} />
            </div>
            {be.chasesNeeded != null && be.probBreakEven != null && (
              <p className="text-sm">
                You need about <strong>{Math.ceil(be.chasesNeeded)}</strong> average chase hit{Math.ceil(be.chasesNeeded) === 1 ? "" : "s"} on top of
                everything else. Chance of pulling at least that many: <strong>{plainPct(be.probBreakEven, 0)}</strong>
                <span className="text-muted-foreground"> (Poisson approximation, assumes independent packs).</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Chase values are averages. The top card in a tier is usually worth far more than the average, so one lucky pull can carry a box
              while most boxes come in below EV.
            </p>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Price vs {mode === "net" ? "net EV" : "EV"} over time</CardTitle>
          <CardDescription>Daily snapshots from price refreshes and manual updates.</CardDescription>
        </CardHeader>
        <CardContent>
          <PriceChart data={chart} evLabel={mode === "net" ? "Net EV" : "EV"} />
        </CardContent>
      </Card>

      {/* Data quality */}
      <Card>
        <CardHeader>
          <CardTitle>Data quality</CardTitle>
          <CardDescription>
            Confidence score {plainPct(s.confidence.score, 0)} = 40% odds quality ({plainPct(s.confidence.oddsScore, 0)}) + 30% price coverage (
            {plainPct(s.confidence.coverageScore, 0)}) + 30% freshness ({plainPct(s.confidence.freshnessScore, 0)}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ul className="list-inside list-disc text-muted-foreground">
            {s.confidence.reasons.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Product price: {money(product.marketPrice)} from {product.priceSource ?? "—"}, updated {ago(product.priceUpdatedAt)} (
            {date(product.priceUpdatedAt)}).
          </p>
          <p className="text-muted-foreground">
            Pull-rate sources:{" "}
            {(["PUBLISHED", "COMMUNITY", "ESTIMATE"] as const)
              .map((src) => `${allTiers.filter((t) => t.oddsSource === src).length} ${src.toLowerCase()}`)
              .join(" · ")}
          </p>
          {user?.isAdmin && (
            <div className="border-t pt-3">
              <ProductPriceForm productId={product.id} price={product.marketPrice} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Watchlist, collection &amp; alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <TrackingForm productId={product.id} initial={tracking} />
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href={`/login?next=/products/${slug}`} className="underline">
                Sign in
              </Link>{" "}
              to track this product and set price alerts.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
