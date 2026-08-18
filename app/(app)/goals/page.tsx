import Link from "next/link";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { listGoals } from "@/lib/db/goals";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { GoalCard } from "@/components/goals/GoalCard";
import type { Goal } from "@/types/db";

type ViewState =
  | { kind: "ok"; goals: Goal[] }
  | { kind: "unconfigured" }
  | { kind: "error"; message: string };

export default async function GoalsPage() {
  const user = await getUser();
  if (!user) return null;

  let state: ViewState;
  const supabase = await tryCreateClient();

  if (!supabase) {
    state = { kind: "unconfigured" };
  } else {
    try {
      const goals = await listGoals(supabase, user.id);
      state = { kind: "ok", goals };
    } catch (err) {
      state = {
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to load goals",
      };
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Goals
          </h1>
          <p className="mt-1 text-slate-500">
            Capture what you want to achieve.
          </p>
        </div>
        {state.kind === "ok" ? (
          <Link href="/goals/new">
            <Button size="sm">New goal</Button>
          </Link>
        ) : null}
      </div>

      <div className="mt-6">
        {state.kind === "unconfigured" ? (
          <Card className="p-6">
            <p className="text-sm text-slate-600">
              The database is not configured, so goals cannot be loaded. Set your
              Supabase environment variables and apply the migration to enable
              this feature. See the README.
            </p>
          </Card>
        ) : null}

        {state.kind === "error" ? (
          <Card className="p-6">
            <p className="text-sm text-red-700">
              Could not load goals: {state.message}
            </p>
          </Card>
        ) : null}

        {state.kind === "ok" && state.goals.length === 0 ? (
          <EmptyState
            title="No goals yet"
            description="Create your first goal. AI plan generation arrives in a later phase."
          >
            <Link href="/goals/new">
              <Button size="sm">New goal</Button>
            </Link>
          </EmptyState>
        ) : null}

        {state.kind === "ok" && state.goals.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {state.goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
