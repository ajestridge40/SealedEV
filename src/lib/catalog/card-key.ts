/** Stable per-set identity for a card printing. */
export function cardKey(c: { name: string; number?: string | null; finish?: string | null; variant?: string | null }): string {
  return [c.number?.trim() || c.name.trim().toLowerCase(), c.finish ?? "NONFOIL", c.variant?.trim().toLowerCase() ?? ""].join("|");
}
