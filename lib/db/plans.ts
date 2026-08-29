import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/types/db";
import { NotFoundError } from "@/lib/db/errors";







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
