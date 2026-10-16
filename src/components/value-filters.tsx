import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import type { ValueFilters } from "@/lib/data/filters";
import { GAMES } from "@/lib/games";
import { PRODUCT_TYPE_LABEL, PRODUCT_TYPES } from "@/lib/product-types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

/** Plain GET form — works without JS and keeps filters in the URL (shareable). */
export function ValueFiltersForm({ f, activeCount }: { f: ValueFilters; activeCount: number }) {
  return (
    <details className="group rounded-xl border bg-card" open={activeCount > 0}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal className="size-4" />
        Filters
        {activeCount > 0 && <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">{activeCount}</span>}
        <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Tap to expand</span>
      </summary>
      <form method="get" className="grid grid-cols-2 gap-3 border-t p-4 md:grid-cols-4">
        <input type="hidden" name="mode" value={f.mode} />
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="q">Search</Label>
          <Input id="q" name="q" placeholder="Name or set…" defaultValue={f.q} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="game">Game</Label>
          <Select id="game" name="game" defaultValue={f.game ?? ""}>
            <option value="">All games</option>
            {GAMES.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.shortName}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">Product type</Label>
          <Select id="type" name="type" defaultValue={f.type ?? ""}>
            <option value="">All types</option>
            {PRODUCT_TYPES.map((t) => (
              <option key={t} value={t}>
                {PRODUCT_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minPrice">Min price ($)</Label>
          <Input id="minPrice" name="minPrice" type="number" inputMode="decimal" min={0} defaultValue={f.minPrice} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxPrice">Max price ($)</Label>
          <Input id="maxPrice" name="maxPrice" type="number" inputMode="decimal" min={0} defaultValue={f.maxPrice} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minRoi">Min ROI (%)</Label>
          <Input id="minRoi" name="minRoi" type="number" inputMode="decimal" placeholder="e.g. -20" defaultValue={f.minRoi} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rating">Rating</Label>
          <Select id="rating" name="rating" defaultValue={f.rating ?? ""}>
            <option value="">Any</option>
            <option value="GOOD">Good Value</option>
            <option value="FAIR">Fair</option>
            <option value="OVERPRICED">Overpriced</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="released">Released</Label>
          <Select id="released" name="released" defaultValue={f.releasedWithin?.toString() ?? ""}>
            <option value="">Any time</option>
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
            <option value="24">Last 2 years</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sort">Sort by</Label>
          <Select id="sort" name="sort" defaultValue={f.sort}>
            <option value="diff">EV − Price (best first)</option>
            <option value="roi">ROI % (best first)</option>
            <option value="ev">EV (highest)</option>
            <option value="price">Price (lowest)</option>
            <option value="release">Newest release</option>
          </Select>
        </div>
        <div className="col-span-2 flex items-end gap-2 md:col-span-2">
          <Button type="submit" className="flex-1">
            Apply
          </Button>
          <Link href={f.mode === "net" ? "/?mode=net" : "/"} className={buttonVariants({ variant: "outline", className: "flex-1" })}>
            Reset
          </Link>
        </div>
      </form>
    </details>
  );
}
