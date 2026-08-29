"use client";

import { useEffect } from "react";
import {
  isPushSupported,
  isPushSubscribed,
  subscribeToPush,
} from "@/lib/notifications/push";





export function PushRegistrar() {
  useEffect(() => {
    if (!isPushSupported()) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    let cancelled = false;
    (async () => {
      try {
        if (await isPushSubscribed()) return;
        if (cancelled) return;
        await subscribeToPush();
      } catch {

      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
