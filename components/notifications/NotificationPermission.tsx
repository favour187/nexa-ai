"use client";

import { useEffect, useState } from "react";
import {
  getPermissionState,
  requestNotificationPermission,
  type PermissionState,
} from "@/lib/notifications/permission";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

/**
 * Shows the current browser notification permission state and lets the user
 * request it via an explicit action. Honest about web-platform limits
 * (specs/notifications.md §4, §11): browser notifications cannot ring the
 * device alarm or bypass Do Not Disturb.
 */
export function NotificationPermission() {
  const [state, setState] = useState<PermissionState>("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(getPermissionState());
    const onFocus = () => setState(getPermissionState());
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
