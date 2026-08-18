import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiProposal } from "@/types/db";
import type { ReplanProposal } from "@/lib/ai/replan-schema";
import { NotFoundError } from "@/lib/db/errors";

/**
 * AI proposal data-access. ai_proposals is the propose/apply mechanism
 * (specs/architecture.md §4): AI outputs that change data are stored here as
 * `pending` and applied only when the user accepts them.
 *
 * Ownership is enforced by RLS (user_id = auth.uid()) via the authenticated
 * user's server client.
 */

export async function createReplanProposal(
  supabase: SupabaseClient,
  userId: string,
  goalId: string,
  proposal: ReplanProposal,
): Promise<AiProposal> {
  const { data, error } = await supabase
    .from("ai_proposals")
    .insert({
      user_id: userId,
      goal_id: goalId,
      kind: "replan",
      payload: proposal as unknown as Record<string, unknown>,
      rationale: proposal.rationale,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data as AiProposal;
}

export async function getProposal(
  supabase: SupabaseClient,
  proposalId: string,
): Promise<AiProposal | null> {
  const { data, error } = await supabase
    .from("ai_proposals")
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();
  if (error) throw error;
  return (data as AiProposal) ?? null;
}

/** Mark a pending proposal rejected (user action; nothing is applied). */
export async function rejectProposal(
  supabase: SupabaseClient,
  proposalId: string,
): Promise<AiProposal> {
  const { data, error } = await supabase
    .from("ai_proposals")
    .update({ status: "rejected" })
    .eq("id", proposalId)
    .eq("status", "pending")
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Proposal not found or already handled");
  return data as AiProposal;
}

/** Store a pending reminder_time proposal (specs/notifications.md §8). */
export async function createReminderProposal(
  supabase: SupabaseClient,
  userId: string,
  goalId: string,
  payload: { task_id: string; remind_at: string },
  rationale: string,
): Promise<AiProposal> {
  const { data, error } = await supabase
    .from("ai_proposals")
    .insert({
      user_id: userId,
      goal_id: goalId,
      kind: "reminder_time",
      payload: payload as unknown as Record<string, unknown>,
      rationale,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as AiProposal;
}
