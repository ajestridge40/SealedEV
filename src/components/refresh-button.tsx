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
          {report.link && (
            <p>
              TCGplayer linking: {report.link.setsLinked} sets, {report.link.productsLinked} products, {report.link.cardsLinked} cards linked ·{" "}
              {report.link.tiersSynced} tiers synced (+{report.link.tierCardsLinked} cards, −{report.link.tierCardsUnlinked})
              {report.link.errors.length > 0 && <span className="text-bad"> · errors: {report.link.errors.join("; ")}</span>}
            </p>
          )}
          {report.link && report.link.unmatched.length > 0 && (
            <details className="rounded-md border p-2 text-xs">
              <summary className="cursor-pointer font-medium">{report.link.unmatched.length} items need a manual TCGplayer id or tier fix</summary>
              <ul className="mt-2 space-y-1.5">
                {report.link.unmatched.map((u, i) => (
                  <li key={i}>
                    <span className="font-medium">
                      [{u.kind}] {u.name}
                    </span>
                    : {u.reason}
                    {u.candidates.length > 0 && <span className="text-muted-foreground"> — candidates: {u.candidates.join(" · ")}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
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
