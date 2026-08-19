"use client";

import { useEffect } from "react";
import { isPushSupported } from "@/lib/notifications/push";

/** Registers /sw.js on every page so background push can be received. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!isPushSupported()) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* unsupported / blocked — stay silent */
    });
  }, []);
  return null;
}
