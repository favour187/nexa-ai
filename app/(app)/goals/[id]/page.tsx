import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { getGoal } from "@/lib/db/goals";
import { listMilestonesForGoal as listMilestones } from "@/lib/db/milestones";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

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

  const milestones = await listMilestones(supabase, goal.id);

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
        <Badge className="bg-amber-100 text-amber-700">{goal.priority}</Badge>
      </div>

      {goal.description ? (
        <p className="mt-2 text-slate-600">{goal.description}</p>
      ) : null}

      <p className="mt-2 text-sm text-slate-500">
        Target deadline: {formatDate(goal.target_deadline)}
      </p>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Plan</h2>
        {milestones.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="No plan yet"
              description="AI plan generation — turning this goal into milestones and tasks — arrives in a later phase."
            >
              <Link href="/dashboard">
                <Button variant="secondary" size="sm">
                  Back to dashboard
                </Button>
              </Link>
            </EmptyState>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {milestones.map((m) => (
              <Card key={m.id} className="p-4">
                <p className="font-medium text-slate-900">{m.title}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
