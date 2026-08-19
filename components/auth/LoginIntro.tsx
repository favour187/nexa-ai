"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/components/auth/usePrefersReducedMotion";

/**
 * Branded login splash (~1.9s). Decorative only — skipped entirely when the
 * user prefers reduced motion. CSS animations live in app/globals.css.
 */
export function LoginIntro() {
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(!reduced);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (reduced) {
      setVisible(false);
      return;
    }
    const t1 = window.setTimeout(() => setLeaving(true), 1500);
    const t2 = window.setTimeout(() => setVisible(false), 1900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reduced]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-50 transition-opacity duration-400 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="animate-nexa-ring absolute inset-0 rounded-2xl border-2 border-brand-400" />
          <span className="animate-mark-in-big flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-600 text-3xl font-bold text-white shadow-lg">
            N
          </span>
        </div>
        <span className="animate-fade-up-delayed text-xl font-semibold tracking-tight text-slate-900">
          NEXA
        </span>
        <span className="animate-fade-up-delayed-2 text-xs tracking-wide text-slate-400">
          Don&apos;t just plan. Execute.
        </span>
      </div>
    </div>
  );
}
