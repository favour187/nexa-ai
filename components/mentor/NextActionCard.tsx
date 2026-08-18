"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import type { NextActionResponse } from "@/lib/ai/next-action-schema";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";

const TIMES = [15, 30, 45, 60];

const urgencyStyles: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

export function NextActionCard() {
  const router = useRouter();
  const [minutes, setMinutes] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [rec, setRec] = useState<NextActionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingAlt, setUsingAlt] = useState(false);
  const [acting, setActing] = useState(false);

  async function onAsk() {
    setLoading(true);
    setError(null);
    setRec(null);
    setUsingAlt(false);
    const avail = minutes ?? (custom ? Number(custom) : undefined);
    try {
      setRec(await api.requestNextAction(avail));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not get a recommendation");
    } finally {
      setLoading(false);
    }
  }

  function currentId(): string | null {
    if (!rec) return null;
    return usingAlt ? rec.alternative_task_id ?? null : rec.recommended_task_id;
  }
  function currentTitle(): string {
    if (!rec) return "";
    return usingAlt ? rec.alternative_task_title ?? "" : rec.recommended_task_title;
  }

  async function act(status: "in_progress" | "done" | "postponed") {
    const taskId = currentId();
    if (!taskId) return;
    setActing(true);
    setError(null);
    try {
      await api.updateTaskStatus(taskId, { status });
      setRec(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update the task");
    } finally {
      setActing(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold text-slate-900">
        What should I do now?
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Optionally tell NEXA how much time you have, then get a single
        recommendation.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {TIMES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setMinutes(t);
              setCustom("");
            }}
            className={
              "rounded-full border px-3 py-1 text-xs " +
              (minutes === t
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-slate-300 text-slate-600 hover:border-brand-400")
            }
          >
            {t} min
          </button>
        ))}
        <input
          type="number"
          min={1}
          aria-label="Custom available minutes"
          placeholder="Custom"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            setMinutes(null);
          }}
          className="h-8 w-24 rounded-md border border-slate-300 px-2 text-xs"
        />
      </div>

      <div className="mt-4">
        <Button onClick={onAsk} loading={loading}>
          Get recommendation
        </Button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading && !rec ? (
        <div className="mt-4 flex justify-center">
          <Spinner className="h-6 w-6 text-brand-600" />
        </div>
      ) : null}

      {rec ? (
        <div className="mt-5 rounded-lg border border-brand-200 bg-brand-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase text-brand-700">
              Do this now
            </span>
            <Badge className={urgencyStyles[rec.urgency]}>
              {rec.urgency} urgency
            </Badge>
          </div>
          {currentId() ? (
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {currentTitle()}
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              Nothing to recommend right now. Add a goal and tasks to get a
              suggestion.
            </p>
          )}

          <p className="mt-2 text-sm text-slate-700">{rec.reason}</p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {rec.estimated_minutes ? (
              <span>About {rec.estimated_minutes} min</span>
            ) : null}
            {rec.goal_title ? <span>Goal: {rec.goal_title}</span> : null}
            {rec.goal_deadline ? (
              <span>Deadline: {formatDate(rec.goal_deadline)}</span>
            ) : null}
          </div>

          {rec.expected_outcome ? (
            <p className="mt-2 text-xs text-slate-500">
              Expected outcome: {rec.expected_outcome}
            </p>
          ) : null}

          {rec.warnings.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-amber-700">
              {rec.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}

          {rec.alternative_task_id ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setUsingAlt((v) => !v)}
                className="text-xs font-medium text-brand-700 underline"
              >
                {usingAlt
                  ? "Show the main recommendation"
                  : `Consider instead: ${rec.alternative_task_title}`}
              </button>
            </div>
          ) : null}

          {currentId() ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" loading={acting} onClick={() => act("in_progress")}>
                Start
              </Button>
              <Button size="sm" variant="secondary" onClick={() => act("done")}>
                Mark complete
              </Button>
              <Button size="sm" variant="secondary" onClick={() => act("postponed")}>
                Postpone
              </Button>
              {rec.goal_id ? (
                <Link href={`/goals/${rec.goal_id}`}>
                  <Button size="sm" variant="ghost">
                    Replan
                  </Button>
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
