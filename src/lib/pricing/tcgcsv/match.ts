import type { TcgGroup, TcgPrice, TcgProduct } from "./client";

/**
 * Pure matching rules that map our sets/products/cards onto TCGplayer's
 * catalogue. Deliberately strict: anything ambiguous is left unmatched and
 * reported (with candidates) so an admin can set the id by hand.
 */

const BRAND_WORDS = new Set(["pokemon", "tcg", "magic", "the", "gathering", "mtg", "disney", "lorcana", "english", "edition", "and", "of", "a"]);
const SET_PREFIX = /^(sv|swsh|sm|xy|bw|me|op|eb|st|prb)\d*[a-z]?\d*$/; // "SV08:", "SWSH12:", "OP09"
const SERIES_WORDS = new Set(["scarlet", "violet", "sword", "shield", "sun", "moon"]);
const SYNONYMS: Record<string, string> = { display: "box", etb: "elite trainer box", boosters: "booster" };

export function tokens(s: string): string[] {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .flatMap((t) => (SYNONYMS[t] ?? t).split(" "))
    .filter((t) => !BRAND_WORDS.has(t));
}

/** Significant tokens of a set name (drops "SV08:", "Scarlet & Violet", brand words). */
export function setTokens(name: string): Set<string> {
  return new Set(tokens(name).filter((t) => !SET_PREFIX.test(t) && !SERIES_WORDS.has(t)));
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((t) => b.has(t));

export type MatchResult<T> = { match: T } | { match: null; reason: string; candidates: T[] };

function pick<T>(found: T[], reasonNone: string, near: T[] = []): MatchResult<T> {
  if (found.length === 1) return { match: found[0] };
  if (found.length > 1) return { match: null, reason: "ambiguous", candidates: found.slice(0, 5) };
  return { match: null, reason: reasonNone, candidates: near.slice(0, 5) };
}

export function matchGroup(setName: string, setCode: string | null, groups: TcgGroup[]): MatchResult<TcgGroup> {
  const ours = setTokens(setName);
  const exact = groups.filter((g) => sameSet(setTokens(g.name), ours));
  if (exact.length > 1) {
    // Prefer the main (non-supplemental) set, then a matching abbreviation.
    const main = exact.filter((g) => !g.isSupplemental);
    if (main.length === 1) return { match: main[0] };
    const byCode = exact.filter((g) => setCode && g.abbreviation?.toLowerCase() === setCode.toLowerCase());
    if (byCode.length === 1) return { match: byCode[0] };
  }
  const near = groups.filter((g) => [...ours].some((t) => setTokens(g.name).has(t)));
  return pick(exact, "no group with the same name", near);
}

const RARITY_CODES: Record<string, string> = { c: "common", u: "uncommon", r: "rare", m: "mythic", s: "special", l: "land", t: "token", p: "promo" };

/** "M" → "mythic", "Mythic Rare" → "mythic", "Special Illustration Rare" unchanged (lowercased). */
export function normRarity(r: string | null | undefined): string {
  const s = (r ?? "").trim().toLowerCase();
  if (RARITY_CODES[s]) return RARITY_CODES[s];
  return s === "mythic rare" ? "mythic" : s;
}

const fold = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function ext(p: TcgProduct, key: string): string | null {
  return p.extendedData?.find((e) => e.name.toLowerCase() === key.toLowerCase())?.value ?? null;
}

/** Cards carry a collector number; sealed products don't. */
export const isCard = (p: TcgProduct) => ext(p, "Number") != null;

/** "238/191" → "238", "007" → "7", "TG01" → "tg01" */
export function normNumber(n: string): string {
  const head = n.split("/")[0].trim().toLowerCase();
  return /^\d+$/.test(head) ? String(Number(head)) : head;
}

/** "Pikachu ex - 238/191" → { base: "pikachu ex", paren: "" }; "Beza (Borderless)" → paren "borderless" */
export function splitCardName(name: string): { base: string; paren: string } {
  const noNum = name.replace(/\s+-\s+[A-Za-z]*\d+[A-Za-z]*(\/\w+)?\s*$/, "");
  const paren = [...noNum.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].toLowerCase()).join(" ");
  const base = noNum.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  return { base, paren };
}

export function matchSealedProduct(
  productName: string,
  setNames: string[],
  catalogue: TcgProduct[],
): MatchResult<TcgProduct> {
  const setToks = new Set(setNames.flatMap((n) => [...setTokens(n)]));
  const sig = (name: string) => new Set(tokens(name).filter((t) => !setToks.has(t) && !SET_PREFIX.test(t) && !SERIES_WORDS.has(t)));
  const ours = sig(productName);
  const sealed = catalogue.filter((p) => !isCard(p));
  const exact = sealed.filter((p) => sameSet(sig(p.name), ours));
  const near = sealed.filter((p) => [...ours].every((t) => sig(p.name).has(t)));
  return pick(exact, "no sealed product with the same name", near);
}

export function matchCard(
  card: { name: string; number: string | null; rarity: string | null; variant: string | null },
  catalogue: TcgProduct[],
): MatchResult<TcgProduct> {
  const cards = catalogue.filter(isCard);
  if (card.number) {
    const byNum = cards.filter((p) => normNumber(ext(p, "Number")!) === normNumber(card.number!));
    if (byNum.length > 1) {
      const byName = byNum.filter((p) => splitCardName(p.name).base === card.name.toLowerCase());
      return pick(byName, "number matches several cards", byNum);
    }
    return pick(byNum, "no card with this number");
  }
  const base = card.name.toLowerCase().trim();
  const variant = card.variant?.toLowerCase() ?? "";
  const named = cards.filter((p) => splitCardName(p.name).base === base);
  const candidates = named.filter((p) => {
    const { paren } = splitCardName(p.name);
    if (paren && !(variant && paren.includes(variant))) return false;
    if (card.rarity && normRarity(ext(p, "Rarity")) !== normRarity(card.rarity)) return false;
    return true;
  });
  return pick(candidates, card.rarity ? `no "${card.name}" with rarity ${card.rarity}` : `no card named "${card.name}"`, named);
}

export interface TierSyncRule {
  syncRarities: string[];
  syncNameContains: string | null;
  syncIncludeVariants: boolean;
}

export const tierSyncEnabled = (t: TierSyncRule) => t.syncRarities.length > 0 || !!t.syncNameContains;

/** All catalogue cards that belong in a synced tier. */
export function cardsForTier(rule: TierSyncRule, catalogue: TcgProduct[]): TcgProduct[] {
  const rarities = new Set(rule.syncRarities.map(normRarity));
  const contains = rule.syncNameContains ? fold(rule.syncNameContains) : null;
  return catalogue.filter(isCard).filter((p) => {
    if (rarities.size && !rarities.has(normRarity(ext(p, "Rarity")))) return false;
    if (contains && !fold(p.name).includes(contains)) return false;
    if (!contains && !rule.syncIncludeVariants && splitCardName(p.name).paren) return false;
    return true;
  });
}

/** Distinct rarity values in a catalogue — shown when a tier sync finds nothing. */
export function rarities(catalogue: TcgProduct[]): string[] {
  return [...new Set(catalogue.map((p) => ext(p, "Rarity")).filter((r): r is string => !!r))].sort();
}

/**
 * Pick the price row for a product. With sub-types given ("Cold Foil,Foil"),
 * only those rows, in that order; otherwise prefer the sub-type matching the finish.
 */
export function pickPrice(rows: TcgPrice[], opts: { subType?: string | null; finish?: "NONFOIL" | "FOIL" | "OTHER" }): number | null {
  const value = (r: TcgPrice) => r.marketPrice ?? r.midPrice;
  const priced = rows.filter((r) => value(r) != null);
  if (opts.subType) {
    const wanted = opts.subType.split(",").map((x) => x.trim().toLowerCase());
    const r = wanted.map((w) => priced.find((x) => x.subTypeName.toLowerCase() === w)).find(Boolean);
    return r ? value(r) : null;
  }
  const prefer = opts.finish === "FOIL" ? ["Foil", "Holofoil", "Reverse Holofoil", "Cold Foil"] : ["Normal", "Holofoil", "Unlimited", "1st Edition"];
  const row = prefer.map((n) => priced.find((r) => r.subTypeName === n)).find(Boolean) ?? priced[0];
  return row ? value(row) : null;
}
