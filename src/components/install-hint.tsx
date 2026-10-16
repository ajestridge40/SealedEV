"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const KEY = "sealedev-install-hint-dismissed";

/**
 * One-time hint for iPhone/iPad Safari users: iOS has no install prompt, so
 * explain Share → Add to Home Screen. Hidden once installed or dismissed.
 */
export function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      // storage unavailable (private mode) — just show the hint
    }
    setShow(isIos && !standalone && !dismissed);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 rounded-xl border bg-card p-3 text-sm shadow-lg md:hidden">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/apple-touch-icon.png" alt="" className="size-10 rounded-lg" />
        <p className="flex-1">
          <strong>Install SealedEV:</strong> tap <Share className="inline size-4 align-text-bottom" /> Share, then{" "}
          <strong>Add to Home Screen</strong>.
        </p>
        <button onClick={dismiss} aria-label="Dismiss" className="text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
