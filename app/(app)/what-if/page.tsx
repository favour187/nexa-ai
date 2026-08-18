"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import type { WhatIfResponse } from "@/lib/ai/whatif-schema";
import type { Goal } from "@/types/db";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

const SUGGESTIONS = [
  "What if I only have 1 hour tomorrow?",
  "What if I miss the next task?",
  "What if I move a task to Friday?",
  "What if I have two hours available instead of one?",
  "What if I want to finish this goal three days earlier?",
];

const feasibilityStyles: Record<string, string> = {
  on_track: "bg-emerald-100 text-emerald-700",
  at_risk: "bg-amber-100 text-amber-700",
  exceeds_deadline: "bg-red-100 text-red-700",
};

export default function WhatIfPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalId, setGoalId] = useState("");
  const [scenario, setScenario] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.listGoals();
        setGoals(list);
        if (list[0]) setGoalId(list[0].id);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function onRun() {
    if (!goalId || !scenario.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied(false);
    setConfirming(false);
    try {
      setResult(await api.requestWhatIf(goalId, scenario.trim()));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not run the simulation");
    } finally {
      setLoading(false);
    }
  }

  async function onApply() {
    if (!result) return;
    setApplying(true);
    setError(null);
    try {
      await api.applyWhatIf(
        result.goal_id,
        result.changes,
        result.simulation.summary,
      );
      setApplied(true);
      setResult(null);
      setConfirming(false);
      setScenario("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not apply the change");
    } finally {
      setApplying(false);
    }
  }

  function onDiscard() {
    setResult(null);
    setConfirming(false);
  }

  const inputClass =
    "h-11 w-full rounded-lg border border-slate-300 px-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        What-If Simulation
      </h1>
      <p className="mt-1 text-slate-500">
        Explore hypothetical changes without touching your real plan. Nothing
        changes until you choose to apply.
      </p>

      {error ? (
        <Card className="mt-4 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      ) : null}

      {applied ? (
        <Card className="mt-4 p-4">
          <p className="text-sm text-emerald-700">
            Simulation applied to your plan. The change was recorded as a replan.
          </p>
        </Card>
      ) : null}

      {goals.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No goals yet"
            description="Create a goal and a plan first, then you can run what-if simulations."
          />
        </div>
      ) : (
        <Card className="mt-6 p-6">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Goal</span>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className={inputClass}
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">
              Hypothetical scenario
            </span>
            <textarea
              rows={3}
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. What if I only have 1 hour tomorrow?"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScenario(s)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-700"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <Button onClick={onRun} loading={loading} disabled={!goalId || !scenario.trim()}>
              Run simulation
            </Button>
          </div>
        </Card>
      )}

      {loading && !result ? (
        <div className="mt-6 flex justify-center">
          <Spinner className="h-7 w-7 text-brand-600" />
        </div>
      ) : null}

      {result ? (
        <Card className="mt-6 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={feasibilityStyles[result.simulation.feasibility]}>
              {result.simulation.feasibility.replace("_", " ")}
            </Badge>
            <span className="text-xs text-slate-500">
              Deadline impact: {result.simulation.deadline_impact}
            </span>
          </div>

          {result.simulation.feasibility === "exceeds_deadline" ? (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              This scenario makes the goal impossible within the deadline. The
              plan will not be changed unless you explicitly apply it.
            </p>
          ) : null}

          <p className="mt-4 text-sm text-slate-600">
            {result.simulation.summary}
          </p>

          <h3 className="mt-5 text-sm font-semibold text-slate-700">
            Simulated changes
          </h3>
          {result.diff.length === 0 && result.removed.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">
              No changes to the schedule. This scenario has no scheduling effect.
            </p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {result.diff.map((d, i) => (
                <li key={`d-${i}`} className="text-sm text-slate-700">
                  {d.kind === "reschedule" ? (
                    <>
                      Reschedule <span className="font-semibold">{d.task_title}</span>
                      : {formatDate(d.before)} → {formatDate(d.after)}
                    </>
                  ) : d.kind === "reprioritize" ? (
                    <>
                      Reprioritize <span className="font-semibold">{d.task_title}</span>
                      : {d.before} → {d.after}
                    </>
                  ) : (
                    <>
                      Add task <span className="font-semibold">{d.title}</span> to{" "}
                      {d.milestone_title}
                      {d.due_at ? ` (due ${formatDate(d.due_at)})` : ""}
                    </>
                  )}
                </li>
              ))}
              {result.removed.map((r) => (
                <li key={`r-${r.task_id}`} className="text-sm text-slate-500">
                  Suggested to skip: <span className="font-semibold">{r.title}</span>{" "}
                  (not removed automatically)
                </li>
              ))}
            </ul>
          )}

          {result.simulation.conflicts.length > 0 ? (
            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase text-slate-500">
                Conflicts
              </h4>
              <ul className="mt-1 list-disc pl-5 text-sm text-amber-700">
                {result.simulation.conflicts.map((c, i) => (
                  <li key={`c-${i}`}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.simulation.warnings.length > 0 ? (
            <div className="mt-3">
              <h4 className="text-xs font-semibold uppercase text-slate-500">
                Warnings
              </h4>
              <ul className="mt-1 list-disc pl-5 text-sm text-amber-700">
                {result.simulation.warnings.map((w, i) => (
                  <li key={`w-${i}`}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-slate-500">
            Nothing changes until you apply. Applying records this as a replan.
          </p>

          <div className="mt-4 flex gap-2">
            {result.changes.length === 0 ? (
              <span className="text-sm text-slate-500">
                Nothing to apply (no-op simulation).
              </span>
            ) : confirming ? (
              <>
                <Button size="sm" loading={applying} onClick={onApply}>
                  Confirm — apply now
                </Button>
                <Button size="sm" variant="secondary" onClick={onDiscard}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={() => setConfirming(true)}>
                  Apply changes
                </Button>
                <Button size="sm" variant="secondary" onClick={onDiscard}>
                  Discard
                </Button>
              </>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
