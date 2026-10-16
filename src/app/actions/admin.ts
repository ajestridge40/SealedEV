"use server";

import { revalidatePath } from "next/cache";
import type { OddsSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { importCsv, importProduct, parsePerPack, type ImportKind } from "@/lib/catalog/import";
import { recordEvSnapshots, recordProductPrice } from "@/lib/pricing/snapshots";
import { runPriceRefresh, type RefreshReport } from "@/lib/pricing/refresh";
import type { FormState } from "./user";

export async function updateProductPrice(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const productId = String(form.get("productId"));
  const price = Number(form.get("price"));
  if (!Number.isFinite(price) || price <= 0) return { error: "Enter a positive price" };
  await recordProductPrice(productId, price, "MANUAL");
  await recordEvSnapshots([productId]);
  revalidatePath("/", "layout");
  return { ok: "Price updated" };
}

export async function updateCardPrice(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const price = Number(form.get("price"));
  if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price" };
  await prisma.card.update({
    where: { id: String(form.get("cardId")) },
    data: { marketPrice: price, priceSource: "MANUAL", priceUpdatedAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { ok: "Card price updated" };
}

export async function updateTier(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const source = String(form.get("oddsSource")) as OddsSource;
  const url = String(form.get("oddsSourceUrl") ?? "").trim() || null;
  if (source === "PUBLISHED" && !url) return { error: "Published odds need a link to the official source" };
  try {
    await prisma.pullTier.update({
      where: { id: String(form.get("tierId")) },
      data: {
        perPack: parsePerPack(String(form.get("perPack"))),
        poolSize: Math.max(1, Number(form.get("poolSize")) || 1),
        unlistedCardValue: Number(form.get("unlistedCardValue")) || 0,
        oddsSource: source,
        oddsSourceNote: String(form.get("oddsSourceNote") ?? "").trim() || null,
        oddsSourceUrl: url,
        syncRarities: String(form.get("syncRarities") ?? "")
          .split(";")
          .map((r) => r.trim())
          .filter(Boolean),
        syncSubType: String(form.get("syncSubType") ?? "").trim() || null,
        syncNameContains: String(form.get("syncNameContains") ?? "").trim() || null,
        syncIncludeVariants: form.get("syncIncludeVariants") === "on",
      },
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/", "layout");
  return { ok: "Tier updated" };
}

export async function importCsvAction(_: (FormState & { details?: string[] }) | undefined, form: FormData) {
  await requireAdmin();
  const kind = String(form.get("kind")) as ImportKind;
  const file = form.get("file");
  const text = file instanceof File && file.size > 0 ? await file.text() : String(form.get("csv") ?? "");
  if (!text.trim()) return { error: "Paste CSV or choose a file" };
  const r = await importCsv(kind, text);
  revalidatePath("/", "layout");
  return {
    ok: `${kind}: ${r.created} created, ${r.updated} updated${r.errors.length ? `, ${r.errors.length} errors` : ""}`,
    details: r.errors.slice(0, 50),
  };
}

export async function refreshNow(): Promise<RefreshReport> {
  await requireAdmin();
  const report = await runPriceRefresh();
  revalidatePath("/", "layout");
  return report;
}

export async function createProduct(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const row: Record<string, string> = {};
  for (const k of ["game", "set", "name", "product_type", "msrp", "market_price", "release_date", "pack_type", "packs", "cards_per_pack", "tcgplayer_product_id"]) {
    row[k] = String(form.get(k) ?? "");
  }
  try {
    const status = await importProduct(row);
    revalidatePath("/", "layout");
    return { ok: `Product ${status}. Add pull tiers for its pack type (CSV "tiers") so EV can be calculated.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Manually set (or clear) TCGplayer ids when auto-linking can't decide. */
export async function updateTcgplayerIds(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    if (!v) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) throw new Error(`${k} must be a positive whole number`);
    return n;
  };
  try {
    await prisma.$transaction([
      prisma.product.update({ where: { id: String(form.get("productId")) }, data: { tcgplayerProductId: id("tcgplayerProductId") } }),
      prisma.set.update({ where: { id: String(form.get("setId")) }, data: { tcgplayerGroupId: id("tcgplayerGroupId") } }),
    ]);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/", "layout");
  return { ok: "Saved. Prices update on the next refresh." };
}
