"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshNow } from "@/app/actions/admin";
import type { RefreshReport } from "@/lib/pricing/refresh";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const [pending, start] = useTransition();
  const [report, setReport] = useState<RefreshReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            try {
              setReport(await refreshNow());
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
      >
        <RefreshCw className={pending ? "animate-spin" : ""} /> {pending ? "Refreshing…" : "Refresh prices now"}
      </Button>
      {error && <p className="text-sm text-bad">{error}</p>}
      {report && (
        <div className="space-y-1 text-sm">
          <p>
            Products updated {report.products.updated}/{report.products.total} ({report.products.noExternalId} without TCGplayer id) · Cards
            updated {report.cards.updated}/{report.cards.total} · EV snapshots {report.evSnapshots} · Alerts fired {report.alertsFired}
          </p>
          <ul className="text-xs text-muted-foreground">
            {report.providers.map((p, i) => (
              <li key={i}>
                {p.id} ({p.kind}): {p.quotes} quotes, {p.missing} missing
                {p.errors.length > 0 && <span className="text-bad"> · errors: {p.errors.join("; ")}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
