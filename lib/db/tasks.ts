import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "@/types/db";
import type { UpdateTaskInput } from "@/lib/validation/tasks";
import { NotFoundError } from "@/lib/db/errors";

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

/**
 * Update a task's status (user action — specs/architecture.md §6). Ownership is
 * enforced by RLS via the authenticated user's server client; a task that is not
 * the user's matches zero rows and throws NotFoundError.
 *
 * Never clears completed_at when leaving "done" (preserves history). The reason,
 * if provided, is stored on status_reason.
 */
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

/** A task with its goal resolved (used by reminder/task selectors). */
export type TaskWithGoal = Task & {
  milestone: {
    plan: { goal: { id: string; title: string } | null } | null;
  } | null;
};

/** All of the user's tasks (RLS-scoped) with the owning goal attached. */
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
