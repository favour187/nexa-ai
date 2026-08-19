"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import type { UnderstandResponse } from "@/lib/ai/understand-schema";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

/**
 * Natural-language command bar (Phase C/E). The user says anything — "I only
 * have an hour tomorrow", "move the hard work to Saturday", "what if I skip
 * Python today?" — and NEXA routes it to the right existing capability via
 * /api/ai/understand. Plan changes are ALWAYS shown as a proposal and require
 * explicit confirmation here; nothing is ever applied silently.
 */
export function NlCommandBar({
  goalId,
  placeholder = "Tell NEXA what changed, what you're worried about, or what you want to try…",
}: {
  goalId?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UnderstandResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.understand(message, goalId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "NEXA could not respond");
    } finally {
      setLoading(false);
    }
  }

  async function onDecide(proposalId: string, accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (accept) {
        await api.acceptProposal(proposalId);
      } else {
        await api.rejectProposal(proposalId);
      }
      setResult(null);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not process the proposal",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <label htmlFor="nl-input" className="sr-only">
          Talk to NEXA
        </label>
        <input
          id="nl-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Button type="submit" loading={loading}>
          Ask NEXA
        </Button>
      </form>
      <p className="mt-2 text-xs text-slate-400">
        Try: “I only have an hour tomorrow” · “Move the hard tasks to Saturday”
        · “What if I skip Python today?” · “Am I falling behind?”
      </p>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          {result.kind === "clarify" ? (
            <p className="text-sm text-slate-700">{result.question}</p>
          ) : null}

          {result.kind === "answer" ? (
            <div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {result.reply}
              </p>
              {result.warnings.length > 0 ? (
                <p className="mt-2 text-xs text-amber-700">
                  {result.warnings.join(" ")}
                </p>
              ) : null}
            </div>
          ) : null}

          {result.kind === "next_action" ? (
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    result.urgency === "high"
                      ? "bg-red-100 text-red-700"
                      : result.urgency === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }
                >
                  {result.urgency} urgency
                </Badge>
                {result.goal_id ? (
                  <Link
                    href={`/goals/${result.goal_id}`}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    {result.goal_title}
                  </Link>
                ) : null}
              </div>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {result.recommended_task_title}
              </p>
              <p className="mt-1 text-sm text-slate-600">{result.reason}</p>
              {result.estimated_minutes ? (
                <p className="mt-1 text-xs text-slate-500">
                  ~{result.estimated_minutes} min
                </p>
              ) : null}
            </div>
          ) : null}

          {result.kind === "what_if" ? (
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    result.response.simulation.feasibility === "exceeds_deadline"
                      ? "bg-red-100 text-red-700"
                      : result.response.simulation.feasibility === "at_risk"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }
                >
                  {result.response.simulation.feasibility.replace("_", " ")}
                </Badge>
                <Link
                  href={`/what-if?goal=${result.goal_id}`}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  {result.goal_title} · review & apply in What-If
                </Link>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {result.response.simulation.summary}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium">Deadline impact:</span>{" "}
                {result.response.simulation.deadline_impact}
              </p>
              {result.response.simulation.warnings.length > 0 ? (
                <p className="mt-2 text-xs text-amber-700">
                  {result.response.simulation.warnings.join(" ")}
                </p>
              ) : null}
            </div>
          ) : null}

          {result.kind === "proposal" ? (
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    result.feasibility === "at_risk"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }
                >
                  {result.feasibility === "at_risk" ? "At risk" : "On track"}
                </Badge>
                <span className="text-xs text-slate-500">
                  Proposed changes for {result.goal_title}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {result.summary}
              </p>
              <p className="mt-1 text-sm text-slate-600">{result.rationale}</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {result.diff.map((d, i) => (
                  <li key={i} className="text-sm text-slate-700">
                    {d.kind === "reschedule" ? (
                      <>
                        Reschedule{" "}
                        <span className="font-semibold">{d.task_title}</span>:{" "}
                        {formatDate(d.before)} → {formatDate(d.after)}
                      </>
                    ) : d.kind === "reprioritize" ? (
                      <>
                        Reprioritize{" "}
                        <span className="font-semibold">{d.task_title}</span>:{" "}
                        {d.before} → {d.after}
                      </>
                    ) : (
                      <>
                        Add task{" "}
                        <span className="font-semibold">{d.title}</span> to{" "}
                        {d.milestone_title}
                        {d.due_at ? ` (due ${formatDate(d.due_at)})` : ""}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  loading={busy}
                  onClick={() => onDecide(result.proposal_id, true)}
                >
                  Approve changes
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busy}
                  onClick={() => onDecide(result.proposal_id, false)}
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
