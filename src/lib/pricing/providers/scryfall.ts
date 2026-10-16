import { emptyResult, sleep, type CardPriceProvider, type CardPriceTarget } from "../types";

/**
 * Scryfall (https://scryfall.com/docs/api) — free Magic card data including
 * daily USD prices (sourced from TCGplayer). Identifies cards by, in order:
 *   scryfallId → set code + collector number → set code + exact name
 * (name lookup only for cards without a variant, since alt-art printings
 * share names).
 */
const ENDPOINT = "https://api.scryfall.com/cards/collection";

interface ScryfallCard {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  prices: { usd: string | null; usd_foil: string | null; usd_etched: string | null };
}

type Identifier = { id: string } | { set: string; collector_number: string } | { name: string; set: string };

function identifierFor(t: CardPriceTarget): Identifier | null {
  if (t.scryfallId) return { id: t.scryfallId };
  if (!t.setCode) return null;
  if (t.number) return { set: t.setCode, collector_number: t.number };
  if (!t.variant) return { name: t.name, set: t.setCode };
  return null;
}

function matches(t: CardPriceTarget, c: ScryfallCard): boolean {
  if (t.scryfallId) return c.id === t.scryfallId;
  if (c.set !== t.setCode?.toLowerCase()) return false;
  if (t.number) return c.collector_number === t.number;
  return c.name.toLowerCase() === t.name.toLowerCase();
}

export const scryfallProvider: CardPriceProvider = {
  id: "SCRYFALL",
  enabled: () => process.env.ENABLE_SCRYFALL !== "0",
  async fetchCardPrices(targets) {
    const result = emptyResult();
    const usable = targets
      .filter((t) => t.gameSlug === "mtg")
      .map((t) => ({ t, ident: identifierFor(t) }))
      .filter((x): x is { t: CardPriceTarget; ident: Identifier } => x.ident != null);

    for (let i = 0; i < usable.length; i += 75) {
      const chunk = usable.slice(i, i + 75);
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "SealedEV/0.1" },
          body: JSON.stringify({ identifiers: chunk.map((x) => x.ident) }),
        });
        if (!res.ok) throw new Error(`Scryfall: HTTP ${res.status}`);
        const body = (await res.json()) as { data: ScryfallCard[] };
        for (const { t } of chunk) {
          const card = body.data.find((c) => matches(t, c));
          const raw = card && (t.finish === "FOIL" ? card.prices.usd_foil : (card.prices.usd ?? card.prices.usd_foil));
          if (raw != null) result.quotes.set(t.id, { price: Number(raw), source: "SCRYFALL" });
          else result.missing.push(t.id);
        }
      } catch (e) {
        result.errors.push((e as Error).message);
      }
      await sleep(120); // Scryfall asks for 50–100ms between requests
    }
    return result;
  },
};
