"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import type { TaskStatus } from "@/types/db";

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "skipped", label: "Skipped" },
  { value: "postponed", label: "Postponed" },
];

const REASON_STATUSES: TaskStatus[] = ["missed", "skipped", "postponed"];
const REASONS = [
  "No time",
  "Too difficult",
  "Forgot",
  "Not feeling ready",
  "Other",
];

const selectClass =
  "h-8 rounded-md border border-slate-300 bg-white px-2 text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500";

/** Per-task status control with optional reason (specs Phase 3 workflow). */
export function TaskStatusControl({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<TaskStatus>(status);
  const [pending, setPending] = useState<TaskStatus | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(next: TaskStatus, r?: string) {
    setLoading(true);
    setError(null);
    try {
      await api.updateTaskStatus(taskId, { status: next, reason: r });
      setCurrent(next);
      setPending(null);
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update task");
      setPending(null);
      setCurrent(status);
    } finally {
      setLoading(false);
    }
  }

  function onStatusChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as TaskStatus;
    setCurrent(next);
    if (REASON_STATUSES.includes(next)) {
      setPending(next);
      return;
    }
    apply(next);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        value={current}
        onChange={onStatusChange}
        disabled={loading}
        className={selectClass}
        aria-label="Task status"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {pending ? (
        <>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={selectClass}
            aria-label="Reason"
          >
            <option value="">Reason…</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => apply(pending, reason || undefined)}
            disabled={loading}
            className="h-8 rounded-md bg-brand-600 px-3 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Save
          </button>
        </>
      ) : null}

      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
