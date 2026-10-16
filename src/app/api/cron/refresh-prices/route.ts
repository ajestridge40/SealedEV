import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runPriceRefresh } from "@/lib/pricing/refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * HTTP trigger for the daily refresh (Vercel Cron, or any scheduler on a
 * long-running server such as the Docker image). On AWS Amplify, run the job
 * with CodeBuild instead (buildspec.jobs.yml) so it isn't bound by request timeouts.
 */
async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const report = await runPriceRefresh();
  return NextResponse.json(report);
}

export const GET = handle;
export const POST = handle;
