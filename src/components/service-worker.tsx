"use client";

import { useEffect } from "react";

/** Registers /sw.js (offline fallback + static asset cache) in production builds. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal: the app works without it, just without the offline page.
    });
  }, []);
  return null;
}
