import { sleep } from "../types";

/**
 * Minimal client for TCGCSV (https://tcgcsv.com) — a free, daily-updated
 * (~20:00 UTC) public mirror of TCGplayer's catalogue and prices.
 *
 *   /tcgplayer/{categoryId}/groups              sets
 *   /tcgplayer/{categoryId}/{groupId}/products  sealed products + cards
 *   /tcgplayer/{categoryId}/{groupId}/prices    one row per product × sub-type
 *
 * Responses are memoised per client, so create one client per refresh run.
 */
const BASE = "https://tcgcsv.com/tcgplayer";

export interface TcgGroup {
  groupId: number;
  name: string;
  abbreviation?: string | null;
  isSupplemental?: boolean;
  publishedOn?: string | null;
  categoryId: number;
}

export interface TcgProduct {
  productId: number;
  name: string;
  cleanName?: string;
  imageUrl?: string | null;
  categoryId: number;
  groupId: number;
  url?: string | null;
  extendedData?: { name: string; displayName?: string; value: string }[];
}

export interface TcgPrice {
  productId: number;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
  directLowPrice?: number | null;
  subTypeName: string;
}

export class TcgcsvClient {
  private cache = new Map<string, Promise<unknown[]>>();

  constructor(private fetchImpl: typeof fetch = fetch) {}

  private get<T>(path: string): Promise<T[]> {
    let p = this.cache.get(path);
    if (!p) {
      p = (async () => {
        const res = await this.fetchImpl(`${BASE}/${path}`, {
          headers: { Accept: "application/json", "User-Agent": "SealedEV/0.2 (daily price refresh)" },
        });
        if (!res.ok) throw new Error(`TCGCSV ${path}: HTTP ${res.status}`);
        const body = (await res.json()) as { success?: boolean; errors?: string[]; results?: T[] };
        if (body.success === false) throw new Error(`TCGCSV ${path}: ${(body.errors ?? []).join("; ") || "error"}`);
        await sleep(100); // be polite
        return body.results ?? [];
      })();
      this.cache.set(path, p);
      p.catch(() => this.cache.delete(path));
    }
    return p as Promise<T[]>;
  }

  groups(categoryId: number) {
    return this.get<TcgGroup>(`${categoryId}/groups`);
  }
  products(categoryId: number, groupId: number) {
    return this.get<TcgProduct>(`${categoryId}/${groupId}/products`);
  }
  prices(categoryId: number, groupId: number) {
    return this.get<TcgPrice>(`${categoryId}/${groupId}/prices`);
  }
}
