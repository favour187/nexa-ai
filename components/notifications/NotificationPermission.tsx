"use client";

import { useEffect, useState } from "react";
import {
  getPermissionState,
  requestNotificationPermission,
  type PermissionState,
} from "@/lib/notifications/permission";
import {
  isPushSupported,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/notifications/push";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/**
 * Notification controls (specs/notifications.md §4, §11; Phase D).
 *
 * Two layers, both permission-first and honest about web-platform limits:
 * 1. Browser notifications — while the NEXA tab is open.
 * 2. Web Push — background delivery even when the NEXA webpage is NOT open,
 *    subject to browser/device permissions and platform/network availability.
 * NEXA is NOT a native alarm clock and never claims to be one.
 */
export function NotificationPermission() {
  const [state, setState] = useState<PermissionState>("default");
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  async function refreshPush() {
    setPushSupported(isPushSupported());
    setPushSubscribed(await isPushSubscribed());
  }

  useEffect(() => {
    setState(getPermissionState());
    refreshPush();
    const onFocus = () => {
      setState(getPermissionState());
      refreshPush();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function onEnable() {
    setBusy(true);
    try {
      setState(await requestNotificationPermission());
    } finally {
      setBusy(false);
    }
  }

  async function onEnablePush() {
    setBusy(true);
    setPushError(null);
    try {
      const sub = await subscribeToPush();
      if (!sub) {
        setPushError(
          "Could not subscribe this device. Check notification permission and that you are on HTTPS.",
        );
      }
      await refreshPush();
    } catch (error) {
      setPushError(
        error instanceof Error
          ? error.message
          : "Could not enable background push",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDisablePush() {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      await refreshPush();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Browser notifications
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            NEXA uses browser notifications to remind you about tasks. Granting
            permission only enables browser notifications — it cannot ring your
            device alarm or bypass Do Not Disturb.
          </p>
        </div>
        <PermissionBadge state={state} />
      </div>

      <div className="mt-3">
        {state === "default" ? (
          <Button size="sm" loading={busy} onClick={onEnable}>
            Enable notifications
          </Button>
        ) : null}
        {state === "denied" ? (
          <p className="text-xs text-slate-500">
            You blocked notifications. To re-enable, allow them in your browser
            site settings. Until then, reminders only appear inside NEXA while
            this tab is open.
          </p>
        ) : null}
        {state === "granted" ? (
          <p className="text-xs text-slate-500">
            Allowed. Reminders can appear as browser notifications while NEXA is
            open.
          </p>
        ) : null}
        {state === "unsupported" ? (
          <p className="text-xs text-slate-500">
            Browser notifications are not supported here. Reminders will appear
            inside NEXA only.
          </p>
        ) : null}
      </div>

      {/* Background push (Phase D) */}
      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              Background push
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              When enabled, NEXA can deliver push notifications in the
              background even when the NEXA webpage is not open — subject to
              browser/device permissions and platform/network availability. It
              is not a native alarm clock and delivery is best-effort.
            </p>
          </div>
          {pushSupported ? (
            <Badge
              className={
                pushSubscribed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }
            >
              {pushSubscribed ? "Subscribed" : "Not subscribed"}
            </Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-500">Unavailable</Badge>
          )}
        </div>

        <div className="mt-3">
          {!pushSupported ? (
            <p className="text-xs text-slate-500">
              Background push is unavailable here (it requires HTTPS and a
              browser with service-worker + push support).
            </p>
          ) : state !== "granted" ? (
            <p className="text-xs text-slate-500">
              Allow browser notifications first, then enable background push.
            </p>
          ) : pushSubscribed ? (
            <Button size="sm" variant="secondary" loading={busy} onClick={onDisablePush}>
              Disable background push
            </Button>
          ) : (
            <Button size="sm" loading={busy} onClick={onEnablePush}>
              Enable background push
            </Button>
          )}
          {pushError ? (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {pushError}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PermissionBadge({ state }: { state: PermissionState }) {
  if (state === "granted") {
    return <Badge className="bg-emerald-100 text-emerald-700">Allowed</Badge>;
  }
  if (state === "denied") {
    return <Badge className="bg-red-100 text-red-700">Blocked</Badge>;
  }
  if (state === "unsupported") {
    return <Badge className="bg-slate-100 text-slate-500">Unsupported</Badge>;
  }
  return <Badge className="bg-amber-100 text-amber-700">Not asked</Badge>;
}
