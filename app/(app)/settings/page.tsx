"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { NotificationPermission } from "@/components/notifications/NotificationPermission";
import type { NotificationSettings } from "@/types/db";

export default function SettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setSettings(await api.getNotificationSettings());
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateQuiet(field: "start" | "end", value: string) {
    setSettings((prev) => {
      if (!prev) return prev;
      const base = prev.quiet_hours ?? { start: "", end: "" };
      const next = { ...base, [field]: value };
      return { ...prev, quiet_hours: next.start && next.end ? next : null };
    });
  }

  async function onSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateNotificationSettings({
        enabled: settings.enabled,
        allow_ai_suggested_times: settings.allow_ai_suggested_times,
        default_lead_minutes: settings.default_lead_minutes,
        quiet_hours: settings.quiet_hours,
      });
      setSettings(updated);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-7 w-7 text-brand-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Settings
      </h1>
      <p className="mt-1 text-slate-500">
        Notifications, reminders, and permissions.
      </p>

      {error ? (
        <Card className="mt-4 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      {!settings ? (
        <Card className="mt-4 p-4">
          <p className="text-sm text-slate-600">
            Notification settings are unavailable. Is the database configured?
          </p>
        </Card>
      ) : (
        <>
          <Card className="mt-6 p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Notifications
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              NEXA delivers reminders as browser notifications while the app is
              open. It cannot ring your device alarm or bypass Do Not Disturb.
            </p>

            <label className="mt-4 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                Notifications enabled (master switch)
              </span>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  setSettings({ ...settings, enabled: e.target.checked })
                }
                className="h-5 w-5 rounded border-slate-300"
              />
            </label>

            <label className="mt-4 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                Allow AI-suggested reminder times
              </span>
              <input
                type="checkbox"
                checked={settings.allow_ai_suggested_times}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    allow_ai_suggested_times: e.target.checked,
                  })
                }
                className="h-5 w-5 rounded border-slate-300"
              />
            </label>

            <label className="mt-4 flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">
                Default lead minutes (remind before a task)
              </span>
              <input
                type="number"
                min={0}
                max={10080}
                value={settings.default_lead_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_lead_minutes: Number(e.target.value) || 0,
                  })
                }
                className="h-10 w-40 rounded-lg border border-slate-300 px-3"
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">
                  Quiet hours start
                </span>
                <input
                  type="time"
                  value={settings.quiet_hours?.start ?? ""}
                  onChange={(e) => updateQuiet("start", e.target.value)}
                  className="h-10 rounded-lg border border-slate-300 px-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700">
                  Quiet hours end
                </span>
                <input
                  type="time"
                  value={settings.quiet_hours?.end ?? ""}
                  onChange={(e) => updateQuiet("end", e.target.value)}
                  className="h-10 rounded-lg border border-slate-300 px-3"
                />
              </label>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Reminders are suppressed during quiet hours (server/browser local
              time).
            </p>

            <div className="mt-5 flex items-center gap-3">
              <Button onClick={onSave} loading={saving}>
                Save settings
              </Button>
              {saved ? (
                <span className="text-sm text-emerald-600">Saved</span>
              ) : null}
            </div>
          </Card>

          <div className="mt-6">
            <NotificationPermission />
          </div>
        </>
      )}
    </div>
  );
}
