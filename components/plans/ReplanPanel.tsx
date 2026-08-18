"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ReplanResponse } from "@/lib/ai/replan-schema";
import { formatDate } from "@/lib/utils";

/**
 * Adaptive replanning surface. Requests a PROPOSED change set, shows a clear
 * current→proposed comparison with rationale, and only applies on explicit
 * approval. Nothing changes until the user approves.
 */
export function ReplanPanel({ goalId }: { goalId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [response, setResponse] = useState<ReplanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRequest() {
    setError(null);
    setLoading(true);
    setResponse(null);
    try {
      setResponse(await api.requestReplan(goalId));
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not generate a replan",
      );
    } finally {
      setLoading(false);
    }
  }

  async function onApprove() {
    if (!response) return;
    setError(null);
    setApplying(true);
    try {
      await api.acceptProposal(response.proposal_id);
      setResponse(null);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not apply the proposal",
      );
    } finally {
      setApplying(false);
    }
  }

  async function onReject() {
    if (!response) return;
    try {
      await api.rejectProposal(response.proposal_id);
      setResponse(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not reject");
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Need to adjust your schedule?
          </h3>
          <p className="text-xs text-slate-500">
            NEXA proposes changes you review and approve. Nothing changes until
            you approve.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          loading={loading}
          onClick={onRequest}
        >
          Replan schedule
        </Button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {response ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-2">
            <Badge
              className={
                response.feasibility === "at_risk"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-emerald-100 text-emerald-700"
              }
            >
              {response.feasibility === "at_risk" ? "At risk" : "On track"}
            </Badge>
            <span className="text-xs text-slate-500">Proposed replan</span>
          </div>

          <p className="mt-2 text-sm text-slate-600">{response.rationale}</p>

          <ul className="mt-3 flex flex-col gap-1.5">
            {response.diff.map((d, i) => (
              <li key={i} className="text-sm text-slate-700">
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
          </ul>

          <div className="mt-4 flex gap-2">
            <Button size="sm" loading={applying} onClick={onApprove}>
              Approve changes
            </Button>
            <Button size="sm" variant="secondary" onClick={onReject}>
              Reject
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
