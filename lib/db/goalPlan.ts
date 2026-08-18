import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiPlan } from "@/lib/ai/schema";

/**
 * Transactional persistence of a goal + its AI-generated draft plan.
 *
 * Delegates to the Postgres function `create_goal_with_plan`
 * (supabase/migrations/0002_ai_planning.sql), which inserts the goal, a DRAFT
 * plan, milestones and tasks in a SINGLE transaction. If anything fails, the
 * whole thing rolls back — no partial plan is ever written
 * (specs/ai.md §9, architecture.md §7).
 *
 * Called with the authenticated user's server client; the function validates
 * `auth.uid()` (SECURITY DEFINER) so a user can only create their own data.
 */

export interface CreatedIds {
  goal_id: string;
  plan_id: string;
}

export interface GoalPlanInput {
  title: string;
  description: string | null;
  priority: string;
  target_deadline: string | null;
  constraints: string | null;
}

/** Shape the validated AI plan into the JSON the DB function expects. */
export function buildMilestonesPayload(plan: AiPlan) {
  return plan.milestones.map((milestone) => ({
    title: milestone.title,
    order_index: milestone.order_index,
    target_date: milestone.target_date ?? null,
    tasks: milestone.tasks.map((task) => ({
      title: task.title,
      description: task.description,
      estimated_minutes: task.estimated_minutes,
      due_at: task.due_at ?? null,
      priority: task.priority,
      order: task.order,
    })),
  }));
}

export async function createGoalWithPlan(
  supabase: SupabaseClient,
  input: GoalPlanInput,
  plan: AiPlan,
): Promise<CreatedIds> {
  const { data, error } = await supabase.rpc("create_goal_with_plan", {
    p_title: input.title,
    p_description: input.description,
    p_priority: input.priority,
    p_target_deadline: input.target_deadline,
    p_constraints: input.constraints,
    p_strategy: plan.strategy,
    p_rationale: plan.rationale,
    p_milestones: buildMilestonesPayload(plan),
  });

  if (error) throw error;

  const result = (data ?? {}) as { goal_id?: string; plan_id?: string };
  if (!result.goal_id || !result.plan_id) {
    throw new Error("Plan was not persisted");
  }
  return { goal_id: result.goal_id, plan_id: result.plan_id };
}
