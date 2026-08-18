import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "@/types/db";

/** Read access for tasks belonging to a milestone. */
export async function listTasksForMilestone(
  supabase: SupabaseClient,
  milestoneId: string,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("milestone_id", milestoneId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Task[];
}
