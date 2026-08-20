"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { Goal } from "@/types/db";

const priorityStyles: Record<Goal["priority"], string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

/** Goal card with quick-complete (deletes goal + all tasks via cascade). */
export function GoalCard({ goal }: { goal: Goal }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onComplete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteGoal(goal.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden p-0">
      {/* Clickable area — navigates to goal detail */}
      <Link href={`/goals/${goal.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            {goal.title}
          </h3>
          <Badge className="bg-emerald-100 text-emerald-700">
            {goal.priority}
          </Badge>
        </div>
        {goal.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {goal.description}
          </p>
        ) : null}
        <div className="mt-3 text-xs text-slate-500">
          Deadline: {formatDate(goal.target_deadline)}
        </div>
      </Link>

      {/* Quick actions */}
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5">
        <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + priorityStyles[goal.priority]}>
          {goal.priority} priority
        </span>
        <button
          type="button"
          onClick={onComplete}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
        >
          {busy ? "✓ Completing…" : "✓ Mark Complete"}
        </button>
      </div>
      {error ? (
        <p className="px-5 pb-2 text-xs text-red-600">{error}</p>
      ) : null}
    </Card>
  );
}
