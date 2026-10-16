import type { ProductType } from "@prisma/client";
import type { EvMode, ValueRating } from "@/lib/ev";
import { PRODUCT_TYPES } from "@/lib/product-types";
import type { ProductListItem } from "./products";

export type SortKey = "diff" | "roi" | "price" | "ev" | "release";

export interface ValueFilters {
  mode: EvMode;
  game?: string;
  type?: ProductType;
  minPrice?: number;
  maxPrice?: number;
  minRoi?: number; // percent, e.g. -10
  rating?: ValueRating;
  /** Released within the last N months. */
  releasedWithin?: number;
  q?: string;
  sort: SortKey;
}

type Params = Record<string, string | string[] | undefined>;

function num(v: string | string[] | undefined): number | undefined {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function parseFilters(sp: Params): ValueFilters {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const type = s("type");
  const rating = s("rating");
  const sort = s("sort");
  return {
    mode: s("mode") === "net" ? "net" : "raw",
    game: s("game") || undefined,
    type: type && (PRODUCT_TYPES as string[]).includes(type) ? (type as ProductType) : undefined,
    minPrice: num(sp.minPrice),
    maxPrice: num(sp.maxPrice),
    minRoi: num(sp.minRoi),
    rating: rating && ["GOOD", "FAIR", "OVERPRICED", "UNKNOWN"].includes(rating) ? (rating as ValueRating) : undefined,
    releasedWithin: num(sp.released),
    q: s("q")?.trim() || undefined,
    sort: sort && ["diff", "roi", "price", "ev", "release"].includes(sort) ? (sort as SortKey) : "diff",
  };
}

/** Filter + rank. Default ranking: biggest positive EV − price gap first. */
export function applyFilters(items: ProductListItem[], f: ValueFilters, now = new Date()): ProductListItem[] {
  const r = (i: ProductListItem) => i.summary[f.mode];
  const out = items.filter((i) => {
    const p = i.product;
    if (f.game && p.game.slug !== f.game) return false;
    if (f.type && p.productType !== f.type) return false;
    if (f.minPrice != null && (p.marketPrice ?? -Infinity) < f.minPrice) return false;
    if (f.maxPrice != null && (p.marketPrice ?? Infinity) > f.maxPrice) return false;
    if (f.minRoi != null && (r(i).roi == null || r(i).roi! * 100 < f.minRoi)) return false;
    if (f.rating && i.summary.rating[f.mode] !== f.rating) return false;
    if (f.releasedWithin != null) {
      if (!p.releaseDate) return false;
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - f.releasedWithin);
      if (p.releaseDate < cutoff) return false;
    }
    if (f.q) {
      const hay = `${p.name} ${p.set.name} ${p.game.name}`.toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    return true;
  });

  const key: Record<SortKey, (i: ProductListItem) => number | null> = {
    diff: (i) => r(i).diff,
    roi: (i) => r(i).roi,
    price: (i) => i.product.marketPrice,
    ev: (i) => r(i).ev,
    release: (i) => i.product.releaseDate?.getTime() ?? null,
  };
  const k = key[f.sort];
  const asc = f.sort === "price";
  return out.sort((a, b) => {
    const va = k(a);
    const vb = k(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1; // nulls last
    if (vb == null) return -1;
    return asc ? va - vb : vb - va;
  });
}
