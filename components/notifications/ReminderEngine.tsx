"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { isWithinQuietHours } from "@/lib/notifications/quietHours";
import { showReminderNotification } from "@/lib/notifications/permission";

/**
 * In-app + browser-notification delivery engine. Runs only while the app is
 * open (specs/notifications.md §5): polls due reminders, fires a browser
 * notification (if permitted) plus an in-app toast, and marks them delivered.
 *
 * Honors the master `enabled` switch and `quiet_hours` (never fires during quiet
 * hours). Does NOT change task status — completing/postponing/missing is a user
 * action handled elsewhere. Closed-tab delivery is handled by Web Push
 * (`/sw.js` + `/api/notifications/dispatch`).
 */
export function ReminderEngine() {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    let running = false;

    const fire = (message: string) => {
      showReminderNotification("NEXA reminder", message);
      if (!active) return;
      setToast(message);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        if (active) setToast(null);
      }, 8000);
    };

    const tick = async () => {
      if (running) return;
      running = true;
      try {
        const settings = await api.getNotificationSettings();
        if (!active || !settings.enabled) return;
        if (isWithinQuietHours(settings.quiet_hours)) return; // respect quiet hours

        const due = await api.listReminders(true);
        if (!active) return;

        for (const reminder of due) {
          const message = reminder.task?.title
            ? `Time to do: ${reminder.task.title}`
            : "You have a task reminder.";
          fire(message);
          try {
            await api.updateReminder(reminder.id, { delivered: true });
          } catch {
            /* best-effort */
          }
        }
      } catch {
        /* settings/reminders unavailable — best-effort, stay silent */
      } finally {
        running = false;
      }
    };

    tick();
    const interval = setInterval(tick, 30_000);
    const onFocus = () => tick();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border border-brand-200 bg-white p-4 shadow-lg"
    >
      <p className="text-sm font-medium text-slate-900">NEXA reminder</p>
      <p className="mt-1 text-sm text-slate-600">{toast}</p>
    </div>
  );
}
