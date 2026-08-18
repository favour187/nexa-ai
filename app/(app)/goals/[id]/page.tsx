import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { getGoal } from "@/lib/db/goals";
import { getLatestPlanForGoal } from "@/lib/db/plans";
import { listMilestonesWithTasks } from "@/lib/db/milestones";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcceptPlanButton } from "@/components/plans/AcceptPlanButton";
import { ReplanPanel } from "@/components/plans/ReplanPanel";
import { TaskStatusControl } from "@/components/tasks/TaskStatusControl";
import { formatDate } from "@/lib/utils";
import type { MilestoneWithTasks, Plan } from "@/types/db";

const priorityStyles: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const planStatusStyles: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
};

export default async function GoalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUser();
  if (!user) return null;

  const supabase = await tryCreateClient();
  if (!supabase) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-600">
          The database is not configured. See the README for setup.
        </p>
      </Card>
    );
  }

  const goal = await getGoal(supabase, user.id, params.id);
  if (!goal) notFound();

  let plan: Plan | null = null;
  let milestones: MilestoneWithTasks[] = [];
  let loadError: string | null = null;
  try {
    plan = await getLatestPlanForGoal(supabase, goal.id);
    if (plan) {
      milestones = await listMilestonesWithTasks(supabase, plan.id);
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Failed to load the plan";
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/goals"
        className="text-sm font-medium text-brand-600 hover:underline"
      >
        ← Back to goals
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {goal.title}
        </h1>
        <Badge className="bg-emerald-100 text-emerald-700">{goal.status}</Badge>
        <Badge className={priorityStyles[goal.priority]}>
          {goal.priority} priority
        </Badge>
      </div>

      {goal.description ? (
        <p className="mt-2 text-slate-600">{goal.description}</p>
      ) : null}

      <div className="mt-2 text-sm text-slate-500">
        Target deadline: {formatDate(goal.target_deadline)}
      </div>
      {goal.constraints ? (
        <div className="mt-1 text-sm text-slate-500">
          Constraints: {goal.constraints}
        </div>
      ) : null}

      {loadError ? (
        <Card className="mt-6 p-4">
          <p className="text-sm text-red-700">{loadError}</p>
        </Card>
      ) : null}

      {/* Plan */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">AI-generated plan</h2>

        {!plan ? (
          <div className="mt-3">
            <EmptyState
              title="No plan yet"
              description="This goal has no plan associated with it."
            />
          </div>
        ) : (
          <Card className="mt-3 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge className={planStatusStyles[plan.status]}>
                {plan.status} plan
              </Badge>
              {plan.status === "draft" ? (
                <AcceptPlanButton planId={plan.id} />
              ) : null}
            </div>

            {plan.strategy ? (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-slate-700">
                  Strategy
                </h3>
                <p className="mt-1 text-sm text-slate-600">{plan.strategy}</p>
              </div>
            ) : null}

            {plan.rationale ? (
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  Why this plan
                </h3>
                <p className="mt-1 text-sm text-slate-600">{plan.rationale}</p>
              </div>
            ) : null}
          </Card>
        )}
      </section>

      {/* Milestones & tasks */}
      {plan && milestones.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Milestones</h2>
          <p className="text-xs text-slate-500">
            Mark tasks as you go. Missed, skipped, or postponed tasks can trigger
            a replan below.
          </p>
          <div className="mt-3 flex flex-col gap-4">
            {milestones.map((milestone, index) => (
              <Card key={milestone.id} className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">
                    <span className="mr-2 text-brand-600">{index + 1}.</span>
                    {milestone.title}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {formatDate(milestone.target_date)}
                  </span>
                </div>

                <ul className="mt-3 flex flex-col gap-2">
                  {milestone.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-800">
                          {task.title}
                        </span>
                        <Badge
                          className={priorityStyles[task.priority ?? "medium"]}
                        >
                          {task.priority ?? "medium"}
                        </Badge>
                      </div>
                      {task.description ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {task.description}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        {task.estimated_minutes ? (
                          <span>{task.estimated_minutes} min</span>
                        ) : null}
                        {task.due_at ? (
                          <span>Due {formatDate(task.due_at)}</span>
                        ) : null}
                        {task.status_reason ? (
                          <span>Reason: {task.status_reason}</span>
                        ) : null}
                      </div>
                      <TaskStatusControl
                        taskId={task.id}
                        status={task.status}
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          {/* Adaptive replanning */}
          {plan.status === "active" ? (
            <div className="mt-6">
              <ReplanPanel goalId={goal.id} />
            </div>
          ) : null}

          <div className="mt-6">
            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                Back to dashboard
              </Button>
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
