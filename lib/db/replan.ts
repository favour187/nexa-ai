import type { SupabaseClient } from "@supabase/supabase-js";
import type { Goal, Milestone, Task } from "@/types/db";
import type { ReplanContext } from "@/lib/ai/replan-schema";

/**
 * Gather the current plan state for one goal to send to the AI (scoped — no
 * secrets/PII). Returns null when the goal is not found / not owned (RLS).
 */
export async function fetchReplanContext(
  supabase: SupabaseClient,
  goalId: string,
): Promise<{ goal: Goal; context: ReplanContext } | null> {
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .maybeSingle();
  if (goalError) throw goalError;
  if (!goal) return null;

  // Prefer the ACTIVE plan (what the user is executing); fall back to the most
  // recent plan if there is no active one yet (architecture.md §4 invariant).
  const { data: activePlan } = await supabase
    .from("plans")
    .select("*")
    .eq("goal_id", goalId)
    .eq("status", "active")
    .maybeSingle();
  // eslint-disable-next-line prefer-const
  let plan = activePlan;
  if (!plan) {
    const { data: latestPlan } = await supabase
      .from("plans")
      .select("*")
      .eq("goal_id", goalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    plan = latestPlan;
  }

  let milestones: Milestone[] = [];
  let tasks: Task[] = [];
  if (plan) {
    const { data: ms, error: msError } = await supabase
      .from("milestones")
      .select("*")
      .eq("plan_id", plan.id)
      .order("order_index", { ascending: true });
    if (msError) throw msError;
    milestones = (ms ?? []) as Milestone[];

    if (milestones.length > 0) {
      const ids = milestones.map((m) => m.id);
      const { data: ts, error: tsError } = await supabase
        .from("tasks")
        .select("*")
        .in("milestone_id", ids)
        .order("order_index", { ascending: true });
      if (tsError) throw tsError;
      tasks = (ts ?? []) as Task[];
    }
  }

  const context: ReplanContext = {
    goal: {
      title: goal.title,
      description: goal.description,
      targetDeadline: goal.target_deadline,
      constraints: goal.constraints,
    },
    strategy: plan?.strategy ?? null,
    milestones: milestones.map((m) => ({
      id: m.id,
      title: m.title,
      order_index: m.order_index,
      target_date: m.target_date,
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      milestone_id: t.milestone_id,
      title: t.title,
      status: t.status,
      due_at: t.due_at,
      priority: t.priority,
      estimated_minutes: t.estimated_minutes,
      order_index: t.order_index,
    })),
  };

  return { goal: goal as Goal, context };
}

/**
 * Apply a pending replan proposal atomically via the `apply_replan` Postgres
 * function (migration 0003). The function validates ownership (auth.uid()),
 * applies the change set, records an ai_event with a before-snapshot (history),
 * and marks the proposal accepted — all in one transaction.
 */
export async function applyReplan(
  supabase: SupabaseClient,
  proposalId: string,
): Promise<{ ok: boolean; proposal_id: string; history_entries: number }> {
  const { data, error } = await supabase.rpc("apply_replan", {
    p_proposal_id: proposalId,
  });
  if (error) throw error;
  return data as { ok: boolean; proposal_id: string; history_entries: number };
}
