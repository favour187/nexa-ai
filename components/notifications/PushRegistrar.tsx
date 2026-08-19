"use client";

import { useEffect } from "react";
import {
  isPushSupported,
  isPushSubscribed,
  subscribeToPush,
} from "@/lib/notifications/push";

/**
 * After the user has already granted notification permission, keep this
 * device subscribed for background push. Does not prompt on page load.
 */
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
        /* best-effort — settings UI shows a specific error if they retry */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
