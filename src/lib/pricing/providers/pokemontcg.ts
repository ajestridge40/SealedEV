import { emptyResult, sleep, type CardPriceProvider } from "../types";

/**
 * Pokémon TCG API (https://pokemontcg.io) — card data with TCGplayer market
 * prices. Only cards with Card.pokemontcgId set (e.g. "sv8-238") are priced.
 * An API key (POKEMONTCG_API_KEY) is optional but raises rate limits.
 */
const ENDPOINT = "https://api.pokemontcg.io/v2/cards";

interface PtcgCard {
  id: string;
  tcgplayer?: { prices?: Record<string, { market?: number | null; mid?: number | null }> };
}

export const pokemonTcgProvider: CardPriceProvider = {
  id: "POKEMONTCG",
  enabled: () => true,
  async fetchCardPrices(targets) {
    const result = emptyResult();
    const usable = targets.filter((t) => t.gameSlug === "pokemon" && t.pokemontcgId);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (process.env.POKEMONTCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;

    for (let i = 0; i < usable.length; i += 40) {
      const chunk = usable.slice(i, i + 40);
      const q = chunk.map((t) => `id:${t.pokemontcgId}`).join(" OR ");
      try {
        const res = await fetch(`${ENDPOINT}?q=${encodeURIComponent(`(${q})`)}&select=id,tcgplayer&pageSize=250`, { headers });
        if (!res.ok) throw new Error(`pokemontcg.io: HTTP ${res.status}`);
        const body = (await res.json()) as { data: PtcgCard[] };
        for (const t of chunk) {
          const prices = body.data.find((c) => c.id === t.pokemontcgId)?.tcgplayer?.prices ?? {};
          const order = t.finish === "FOIL" ? ["reverseHolofoil", "holofoil", "normal"] : ["holofoil", "normal", "reverseHolofoil"];
          const p = order.map((k) => prices[k]).find((v) => v && (v.market ?? v.mid) != null);
          const price = p ? (p.market ?? p.mid) : null;
          if (price != null) result.quotes.set(t.id, { price, source: "POKEMONTCG" });
          else result.missing.push(t.id);
        }
      } catch (e) {
        result.errors.push((e as Error).message);
      }
      await sleep(200);
    }
    return result;
  },
};
