import type { SupabaseClient } from "@supabase/supabase-js";
import type { Goal } from "@/types/db";
import type { CreateGoalInput, UpdateGoalInput } from "@/lib/validation/goals";















export async function listGoals(
  supabase: SupabaseClient,
  userId: string,
): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Goal[];
}

export async function getGoal(
  supabase: SupabaseClient,
  userId: string,
  goalId: string,
): Promise<Goal | null> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as Goal) ?? null;
}

export async function createGoal(
  supabase: SupabaseClient,
  userId: string,
  input: CreateGoalInput,
): Promise<Goal> {
  const row = {
    user_id: userId,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority,
    target_deadline: input.target_deadline ?? null,
    status: "active" as const,
  };

  const { data, error } = await supabase
    .from("goals")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data as Goal;
}

export async function updateGoal(
  supabase: SupabaseClient,
  userId: string,
  goalId: string,
  input: UpdateGoalInput,
): Promise<Goal> {

  const patch = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined),
  );

  const { data, error } = await supabase
    .from("goals")
    .update(patch)
    .eq("id", goalId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data as Goal;
}

export async function deleteGoal(
  supabase: SupabaseClient,
  userId: string,
  goalId: string,
): Promise<void> {
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId);

  if (error) throw error;
}
