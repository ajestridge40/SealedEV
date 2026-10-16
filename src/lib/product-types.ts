import type { ProductType } from "@prisma/client";

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  BOOSTER_BOX: "Booster Box",
  PLAY_BOOSTER_BOX: "Play Booster Box",
  COLLECTOR_BOOSTER_BOX: "Collector Box",
  ELITE_TRAINER_BOX: "Elite Trainer Box",
  BOOSTER_BUNDLE: "Booster Bundle",
  BUNDLE: "Bundle",
  SPECIAL_COLLECTION: "Special Collection",
  BOOSTER_PACK: "Booster Pack",
  CASE: "Case",
  OTHER: "Other",
};

export const PRODUCT_TYPES = Object.keys(PRODUCT_TYPE_LABEL) as ProductType[];

export function parseProductType(s: string): ProductType | null {
  const norm = s.trim().toUpperCase().replace(/[^A-Z]+/g, "_");
  if (norm in PRODUCT_TYPE_LABEL) return norm as ProductType;
  const byLabel = PRODUCT_TYPES.find((t) => PRODUCT_TYPE_LABEL[t].toLowerCase() === s.trim().toLowerCase());
  if (byLabel) return byLabel;
  if (norm === "ETB") return "ELITE_TRAINER_BOX";
  return null;
}
