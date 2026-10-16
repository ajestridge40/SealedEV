import type { CardPriceProvider, ProductPriceProvider } from "./types";
import { tcgcsvCardProvider, tcgcsvProductProvider } from "./providers/tcgcsv";
import { scryfallProvider } from "./providers/scryfall";
import { pokemonTcgProvider } from "./providers/pokemontcg";

/**
 * Providers run in order; for each item the first provider that returns a
 * quote wins. Put the most trusted source first.
 */
export const PRODUCT_PROVIDERS: ProductPriceProvider[] = [tcgcsvProductProvider];
export const CARD_PROVIDERS: CardPriceProvider[] = [tcgcsvCardProvider, scryfallProvider, pokemonTcgProvider];
