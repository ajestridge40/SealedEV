"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type FormState = { error?: string; ok?: string } | undefined;

const authSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "/";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const parsed = authSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) return { error: "An account with that email already exists" };
  await prisma.user.create({ data: { email, passwordHash: await bcrypt.hash(parsed.data.password, 10) } });
  await signIn("credentials", { email, password: parsed.data.password, redirectTo: safeNext(form.get("next")) });
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  try {
    await signIn("credentials", {
      email: String(form.get("email") ?? "").toLowerCase(),
      password: form.get("password"),
      redirectTo: safeNext(form.get("next")),
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Invalid email or password" };
    throw e; // redirect
  }
}

function revalidateUserViews(productSlug?: string) {
  revalidatePath("/");
  revalidatePath("/watchlist");
  revalidatePath("/collection");
  if (productSlug) revalidatePath(`/products/${productSlug}`);
}

export async function toggleWatch(productId: string) {
  const user = await requireUser();
  const existing = await prisma.userProduct.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  const up = await prisma.userProduct.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId, watching: true },
    update: { watching: !existing?.watching },
    include: { product: { select: { slug: true } } },
  });
  revalidateUserViews(up.product.slug);
  return up.watching;
}

export async function adjustOwned(productId: string, delta: number) {
  const user = await requireUser();
  const existing = await prisma.userProduct.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  const ownedQty = Math.max(0, (existing?.ownedQty ?? 0) + delta);
  const up = await prisma.userProduct.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId, ownedQty },
    update: { ownedQty },
    include: { product: { select: { slug: true } } },
  });
  revalidateUserViews(up.product.slug);
  return up.ownedQty;
}

function optNum(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function saveTracking(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const productId = String(form.get("productId"));
  const data = {
    watching: form.get("watching") === "on",
    ownedQty: Math.max(0, Math.round(optNum(form.get("ownedQty")) ?? 0)),
    costBasis: optNum(form.get("costBasis")),
    alertMaxPrice: optNum(form.get("alertMaxPrice")),
    alertMinRoi: optNum(form.get("alertMinRoi")),
    alertUseNet: form.get("alertUseNet") === "on",
    lastAlertAt: null, // re-arm after edits
  };
  const up = await prisma.userProduct.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId, ...data },
    update: data,
    include: { product: { select: { slug: true } } },
  });
  revalidateUserViews(up.product.slug);
  return { ok: "Saved" };
}

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/settings");
  const fee = optNum(form.get("feePct"));
  await prisma.user.update({
    where: { id: user.id },
    data: {
      feePct: fee != null ? fee / 100 : null,
      perCardCost: optNum(form.get("perCardCost")),
      sellThreshold: optNum(form.get("sellThreshold")),
      bulkValue: optNum(form.get("bulkValue")),
    },
  });
  revalidatePath("/", "layout");
  return { ok: "Saved — net EV now uses your assumptions" };
}

export async function markAllRead() {
  const user = await requireUser("/notifications");
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export async function goLogin(next: string) {
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
