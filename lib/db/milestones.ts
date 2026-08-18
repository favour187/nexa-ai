import type { SupabaseClient } from "@supabase/supabase-js";
import type { Milestone, MilestoneWithTasks, Task } from "@/types/db";

/** Read access for milestones belonging to a goal (via its plans). */
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

/** Milestones for a plan, each with its nested tasks (ordered). */
export async function listMilestonesWithTasks(
  supabase: SupabaseClient,
  planId: string,
): Promise<MilestoneWithTasks[]> {
  const { data, error } = await supabase
    .from("milestones")
    .select("*, tasks(*)")
    .eq("plan_id", planId)
    .order("order_index", { ascending: true });

  if (error) throw error;

  const milestones = (data ?? []) as MilestoneWithTasks[];
  for (const milestone of milestones) {
    milestone.tasks = (milestone.tasks ?? [])
      .slice()
      .sort((a: Task, b: Task) => a.order_index - b.order_index);
  }
  return milestones;
}
