import type { SupabaseClient } from "@supabase/supabase-js";
import type { Milestone } from "@/types/db";

/**
 * Read access for milestones. In Phase 1 these return [] because no plan is
 * generated yet (plan generation is an AI-phase feature). Provided now so the
 * data model and goal-detail surface are wired and ready.
 */
export async function listMilestonesForGoal(
  supabase: SupabaseClient,
  goalId: string,
): Promise<Milestone[]> {
  const { data: plans, error: plansError } = await supabase
    .from("plans")
    .select("id")
    .eq("goal_id", goalId);

  if (plansError) throw plansError;

  const planIds = (plans ?? []).map((p: { id: string }) => p.id);
  if (planIds.length === 0) return [];

  const { data, error } = await supabase
    .from("milestones")
    .select("*")
    .in("plan_id", planIds)
    .order("order_index", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Milestone[];
}
