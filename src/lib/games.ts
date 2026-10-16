/**
 * Supported games. To add a game: append an entry here, run `npm run db:seed`
 * (games are upserted from this list), then add sets/products via the admin
 * page, CSV import or a seed file in prisma/seed-data/.
 *
 * tcgplayerCategoryId is used by the TCGCSV price provider.
 */
export interface GameConfig {
  slug: string;
  name: string;
  shortName: string;
  tcgplayerCategoryId?: number;
  /** Tailwind classes for the game chip. */
  chip: string;
}

export const GAMES: GameConfig[] = [
  { slug: "pokemon", name: "Pokémon TCG", shortName: "Pokémon", tcgplayerCategoryId: 3, chip: "bg-yellow-400/15 text-yellow-700 dark:text-yellow-300" },
  { slug: "mtg", name: "Magic: The Gathering", shortName: "Magic", tcgplayerCategoryId: 1, chip: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  { slug: "yugioh", name: "Yu-Gi-Oh!", shortName: "Yu-Gi-Oh!", tcgplayerCategoryId: 2, chip: "bg-purple-500/15 text-purple-700 dark:text-purple-300" },
  { slug: "one-piece", name: "One Piece Card Game", shortName: "One Piece", tcgplayerCategoryId: 68, chip: "bg-red-500/15 text-red-700 dark:text-red-300" },
  { slug: "lorcana", name: "Disney Lorcana", shortName: "Lorcana", tcgplayerCategoryId: 71, chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
];

export function gameChip(slug: string): string {
  return GAMES.find((g) => g.slug === slug)?.chip ?? "bg-muted text-muted-foreground";
}
