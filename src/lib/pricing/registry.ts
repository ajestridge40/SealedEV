import type { CardPriceProvider, ProductPriceProvider } from "./types";
import { TcgcsvClient } from "./tcgcsv/client";
import { tcgcsvProviders } from "./providers/tcgcsv";
import { scryfallProvider } from "./providers/scryfall";
import { pokemonTcgProvider } from "./providers/pokemontcg";

/**
 * Providers for one refresh run. They run in order; for each item the first
 * provider that returns a quote wins. TCGCSV covers every game (sealed and
 * singles); Scryfall and pokemontcg.io only fill gaps for unlinked cards.
 */
export function buildProviders(client = new TcgcsvClient()) {
  const tcgcsv = tcgcsvProviders(client);
  const product: ProductPriceProvider[] = [tcgcsv.product];
  const card: CardPriceProvider[] = [tcgcsv.card, scryfallProvider, pokemonTcgProvider];
  return { client, product, card };
}
