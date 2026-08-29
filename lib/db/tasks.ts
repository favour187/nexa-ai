import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "@/types/db";
import type { UpdateTaskInput } from "@/lib/validation/tasks";
import { NotFoundError } from "@/lib/db/errors";


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









export async function updateTaskStatus(
  supabase: SupabaseClient,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const patch: Record<string, unknown> = {
    status: input.status,
    status_reason: input.reason ?? null,
  };
  if (input.status === "done") {
    patch.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new NotFoundError("Task not found");
  return data as Task;
}


export type TaskWithGoal = Task & {
  milestone: {
    plan: { goal: { id: string; title: string } | null } | null;
  } | null;
};


export async function listTasksForUser(
  supabase: SupabaseClient,
): Promise<TaskWithGoal[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, milestone:milestones(plan:plans(goal:goals(id, title)))")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TaskWithGoal[];
}
