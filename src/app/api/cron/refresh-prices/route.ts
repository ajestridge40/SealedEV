import { NextResponse } from "next/server";
import { runPriceRefresh } from "@/lib/pricing/refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Called daily by Vercel Cron (see vercel.json). Requires CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await runPriceRefresh();
  return NextResponse.json(report);
}
