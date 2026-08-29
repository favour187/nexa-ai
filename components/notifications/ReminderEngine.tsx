"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { isWithinQuietHours } from "@/lib/notifications/quietHours";
import { showReminderNotification } from "@/lib/notifications/permission";
import { speak } from "@/lib/voice/speech";
import { vibrateReminder } from "@/lib/notifications/haptics";







export function ReminderEngine() {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {

    const params = new URLSearchParams(window.location.search);
    const speakText = params.get("speak");
    if (speakText) {
      speak(speakText);

      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let running = false;

    const fire = (message: string) => {
      showReminderNotification("NEXA reminder", message);
      speak(message);
      vibrateReminder();
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
        if (isWithinQuietHours(settings.quiet_hours)) return;

        const due = await api.listReminders(true);
        if (!active) return;

        for (const reminder of due) {
          const message = reminder.task?.title
            ? `Time to do: ${reminder.task.title}`
            : "You have a task reminder.";
          fire(message);

          try {
            await api.deleteReminder(reminder.id);
          } catch {

          }
        }
      } catch {

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
      className="fixed inset-x-3 bottom-4 z-50 mx-auto max-w-sm rounded-lg border border-brand-200 bg-white p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:mx-0"
    >
      <p className="text-sm font-medium text-slate-900">NEXA reminder</p>
      <p className="mt-1 text-sm text-slate-600">{toast}</p>
    </div>
  );
}
