"use client";

import { useEffect } from "react";
import { isPushSupported } from "@/lib/notifications/push";


export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!isPushSupported()) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {

    });
  }, []);
  return null;
}
