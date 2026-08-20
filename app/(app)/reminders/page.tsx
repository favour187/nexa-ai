"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  api,
  ApiError,
  type ReminderRecommendationResponse,
} from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import type { ReminderWithTask } from "@/types/db";

interface TaskItem {
  id: string;
  title: string;
  milestone: {
    plan: { goal: { id: string; title: string } | null } | null;
  } | null;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderWithTask[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [taskId, setTaskId] = useState("");
  const [datetime, setDatetime] = useState("");
  const [creating, setCreating] = useState(false);

  const [aiBusy, setAiBusy] = useState(false);
  const [rec, setRec] = useState<ReminderRecommendationResponse | null>(null);
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, taskList] = await Promise.all([
        api.listReminders(),
        api.listTasks(),
      ]);
      setReminders(list);
      setTasks(taskList as TaskItem[]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load reminders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskId || !datetime) return;
    setCreating(true);
    setError(null);
    try {
      await api.createReminder({
        task_id: taskId,
        remind_at: new Date(datetime).toISOString(),
      });
      setTaskId("");
      setDatetime("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create reminder");
    } finally {
      setCreating(false);
    }
  }

  async function onSuggest() {
    if (!taskId) return;
    setAiBusy(true);
    setError(null);
    setRec(null);
    try {
      setRec(await api.requestReminderRecommendation(taskId));
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "Could not get a suggestion. Enable AI-suggested times in Settings.",
      );
    } finally {
      setAiBusy(false);
    }
  }

  async function onAcceptRec() {
    if (!rec) return;
    setAccepting(true);
    try {
      await api.acceptProposal(rec.proposal_id);
      setRec(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not accept");
    } finally {
      setAccepting(false);
    }
  }

  async function onToggle(id: string, enabled: boolean) {
    try {
      await api.updateReminder(id, { enabled: !enabled });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update reminder");
    }
  }

  async function onDelete(id: string) {
    try {
      await api.deleteReminder(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete reminder");
    }
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-slate-300 px-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500";

  // Only show reminders still ahead of us — nothing past its time lingers here.
  const nowMs = Date.now();
  const upcoming = reminders.filter(
    (r) => new Date(r.remind_at).getTime() >= nowMs,
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Reminders
      </h1>
      <p className="mt-1 text-slate-500">
        Every task with a due time gets a reminder automatically. Extra custom
        times are optional. Delivery is in-app while NEXA is open, and as a
        background push when you have allowed notifications.
      </p>

      {error ? (
        <Card className="mt-4 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      <Card className="mt-6 p-6">
        <h2 className="text-base font-semibold text-slate-900">
          New reminder
        </h2>
        {tasks.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Create a goal and a plan first, then you can add reminders to tasks.
          </p>
        ) : (
          <form onSubmit={onCreate} className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Task</span>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a task…</option>
                {tasks.map((t) => {
                  const goal = t.milestone?.plan?.goal?.title;
                  return (
                    <option key={t.id} value={t.id}>
                      {goal ? `${goal} — ` : ""}
                      {t.title}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Remind at</span>
              <input
                type="datetime-local"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                className={inputClass}
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" loading={creating} disabled={!taskId || !datetime}>
                Create reminder
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                loading={aiBusy}
                disabled={!taskId}
                onClick={onSuggest}
              >
                Suggest time (AI)
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              AI suggestions require enabling AI-suggested times in Settings.
            </p>
          </form>
        )}

        {rec ? (
          <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-4">
            <p className="text-sm font-medium text-brand-800">
              AI suggests: {formatDate(rec.remind_at)}
            </p>
            <p className="mt-1 text-sm text-brand-700">{rec.rationale}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" loading={accepting} onClick={onAcceptRec}>
                Use this time
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setRec(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Upcoming reminders
        </h2>
        {loading ? (
          <div className="mt-4 flex justify-center">
            <Spinner className="h-7 w-7 text-brand-600" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No reminders yet"
              description="Scheduled tasks get a reminder at due time automatically. You can still add an extra custom time above."
            />
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {upcoming.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {r.task?.title ?? "Task"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Remind at {formatDate(r.remind_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!r.enabled ? (
                    <Badge className="bg-slate-100 text-slate-500">Disabled</Badge>
                  ) : r.delivered ? (
                    <Badge className="bg-slate-100 text-slate-500">Delivered</Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onToggle(r.id, r.enabled)}
                  >
                    {r.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => onDelete(r.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
