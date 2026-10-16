const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function money(n: number | null | undefined, opts?: { whole?: boolean }): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return (opts?.whole ? usd0 : usd).format(n);
}

export function signedMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return (n >= 0 ? "+" : "−") + usd.format(Math.abs(n));
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return (n >= 0 ? "+" : "−") + Math.abs(n * 100).toFixed(digits) + "%";
}

export function plainPct(n: number, digits = 1): string {
  return (n * 100).toFixed(digits) + "%";
}

/** 1/87 → "1 in 87 packs"; 2.5 → "2.5 per pack" */
export function odds(perPack: number): string {
  if (perPack <= 0) return "never";
  if (perPack >= 1) return `${+perPack.toFixed(2)} per pack`;
  const n = 1 / perPack;
  return `1 in ${n >= 10 ? Math.round(n) : +n.toFixed(1)} packs`;
}

export function date(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export function ago(d: Date | null | undefined, now = new Date()): string {
  if (!d) return "never";
  const s = Math.round((now.getTime() - d.getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const days = Math.round(s / 86400);
  if (days < 60) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}
