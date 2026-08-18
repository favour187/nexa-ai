import type { SupabaseClient } from "@supabase/supabase-js";
import type { Reminder, ReminderWithTask } from "@/types/db";
import type {
  CreateReminderInput,
  UpdateReminderInput,
} from "@/lib/validation/reminders";
import { NotFoundError } from "@/lib/db/errors";

/**
 * reminder_schedules data-access. Ownership is enforced by RLS
 * (user_id = auth.uid()); every query is additionally scoped by userId.
 */

export async function listReminders(
  supabase: SupabaseClient,
  userId: string,
  options: { due?: boolean } = {},
): Promise<ReminderWithTask[]> {
  let query = supabase
    .from("reminder_schedules")
    .select("*, task:tasks(id, title)")
    .eq("user_id", userId);

  if (options.due) {
    query = query
      .eq("enabled", true)
      .eq("delivered", false)
      .lte("remind_at", new Date().toISOString());
  } else {
    query = query.order("remind_at", { ascending: true });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ReminderWithTask[];
}

export async function getReminder(
  supabase: SupabaseClient,
  userId: string,
  reminderId: string,
): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from("reminder_schedules")
    .select("*")
    .eq("id", reminderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Reminder) ?? null;
}

export async function createReminder(
  supabase: SupabaseClient,
  userId: string,
  input: CreateReminderInput,
): Promise<Reminder> {
  // Defense in depth: the task must belong to the user (RLS scopes the read).
  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", input.task_id)
    .maybeSingle();
  if (!task) throw new NotFoundError("Task not found");

  const row = {
    task_id: input.task_id,
    user_id: userId,
    remind_at: input.remind_at,
    enabled: true,
    channel: input.channel ?? "in_app",
    lead_minutes: input.lead_minutes ?? null,
  };

  const { data, error } = await supabase
    .from("reminder_schedules")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as Reminder;
}

export async function updateReminder(
  supabase: SupabaseClient,
  userId: string,
  reminderId: string,
  input: UpdateReminderInput,
): Promise<Reminder> {
  const patch = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );

  const { data, error } = await supabase
    .from("reminder_schedules")
    .update(patch)
    .eq("id", reminderId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new NotFoundError("Reminder not found");
  return data as Reminder;
}

export async function deleteReminder(
  supabase: SupabaseClient,
  userId: string,
  reminderId: string,
): Promise<void> {
  const { error } = await supabase
    .from("reminder_schedules")
    .delete()
    .eq("id", reminderId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Apply a pending reminder_time proposal atomically (migration 0004). */
export async function applyReminderProposal(
  supabase: SupabaseClient,
  proposalId: string,
): Promise<{ ok: boolean; reminder_id: string }> {
  const { data, error } = await supabase.rpc("apply_reminder_proposal", {
    p_proposal_id: proposalId,
  });
  if (error) throw error;
  return data as { ok: boolean; reminder_id: string };
}
