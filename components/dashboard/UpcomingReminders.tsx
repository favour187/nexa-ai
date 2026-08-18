"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import type { ReminderWithTask } from "@/types/db";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";

/** Compact preview of upcoming reminders for the dashboard (existing data). */
export function UpcomingReminders() {
  const [reminders, setReminders] = useState<ReminderWithTask[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const all = await api.listReminders();
        setReminders(
          all.filter((r) => r.enabled && !r.delivered).slice(0, 4),
        );
      } catch {
        setReminders([]);
      }
    })();
  }, []);

  if (reminders === null) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="h-4 w-4 text-brand-600" /> Loading reminders…
        </div>
      </Card>
    );
  }

  if (reminders.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Upcoming reminders
        </h2>
        <Link
          href="/reminders"
          className="text-xs font-medium text-brand-600 hover:underline"
        >
          Manage
        </Link>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {reminders.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="truncate text-slate-700">
              {r.task?.title ?? "Task"}
            </span>
            <span className="shrink-0 text-xs text-slate-500">
              {formatDate(r.remind_at)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
