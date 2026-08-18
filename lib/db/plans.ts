import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/types/db";
import { NotFoundError } from "@/lib/db/errors";

/**
 * Plan data-access. Ownership is enforced by Row-Level Security via the
 * authenticated user's server client (specs/architecture.md §5): a user can
 * only read/update plans whose goal they own.
 */

export async function getPlan(
  supabase: SupabaseClient,
  planId: string,
): Promise<Plan | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();
  if (error) throw error;
  return (data as Plan) ?? null;
}

/** Return the active plan for a goal if one exists. */
export async function getActivePlanForGoal(
  supabase: SupabaseClient,
  goalId: string,
): Promise<Plan | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("goal_id", goalId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return (data as Plan) ?? null;
}

/** Return the most recently created plan for a goal (active or draft). */
export async function getLatestPlanForGoal(
  supabase: SupabaseClient,
  goalId: string,
): Promise<Plan | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Plan) ?? null;
}

/**
 * Promote a draft plan to active (user action — specs/architecture.md §6).
 * RLS ensures a user can only accept their own plan; if the plan does not exist
 * or is not owned, the update matches zero rows and we throw NotFoundError.
 */
export async function acceptPlan(
  supabase: SupabaseClient,
  planId: string,
): Promise<Plan> {
  const { data, error } = await supabase
    .from("plans")
    .update({ status: "active" })
    .eq("id", planId)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Plan not found");
  return data as Plan;
}
