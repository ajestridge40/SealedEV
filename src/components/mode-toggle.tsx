import Link from "next/link";
import type { EvMode } from "@/lib/ev";
import { cn } from "@/lib/utils";

/** Raw vs net (after fees/shipping/bulk) EV — stored in the URL. */
export function ModeToggle({ mode, hrefFor }: { mode: EvMode; hrefFor: (m: EvMode) => string }) {
  const opt = (m: EvMode, label: string) => (
    <Link
      href={hrefFor(m)}
      scroll={false}
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium",
        mode === m ? "bg-background shadow-sm" : "text-muted-foreground",
      )}
      aria-current={mode === m ? "true" : undefined}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="EV mode">
      {opt("raw", "Raw EV")}
      {opt("net", "Net EV (after costs)")}
    </div>
  );
}

export function withParams(base: string, params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const q = sp.toString();
  return q ? `${base}?${q}` : base;
}
