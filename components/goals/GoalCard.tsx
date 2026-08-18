import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import type { Goal } from "@/types/db";

const priorityStyles: Record<Goal["priority"], string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const statusStyles: Record<Goal["status"], string> = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-slate-100 text-slate-600",
  completed: "bg-brand-100 text-brand-700",
  archived: "bg-slate-100 text-slate-400",
};

export function GoalCard({ goal }: { goal: Goal }) {
  return (
    <Link href={`/goals/${goal.id}`} className="block">
      <Card className="p-5 transition-colors hover:border-brand-300">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            {goal.title}
          </h3>
          <Badge className={statusStyles[goal.status]}>{goal.status}</Badge>
        </div>
        {goal.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {goal.description}
          </p>
        ) : null}
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <Badge className={priorityStyles[goal.priority]}>
            {goal.priority}
          </Badge>
          <span>Deadline: {formatDate(goal.target_deadline)}</span>
        </div>
      </Card>
    </Link>
  );
}
