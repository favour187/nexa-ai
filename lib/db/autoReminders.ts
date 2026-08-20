import type { SupabaseClient } from "@supabase/supabase-js";
import { getNotificationSettings } from "@/lib/db/notifications";
import { deletePastReminders } from "@/lib/db/reminders";
import {
  isOpenScheduledTask,
  planAutoReminders,
  type ExistingReminder,
  type OpenScheduledTask,
} from "@/lib/notifications/dueReminder";

/**
 * Make sure every open, scheduled task has a reminder at due time.
 * Idempotent. Custom reminders (lead_minutes null) are never overwritten.
 */

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function userIdFromTaskRow(row: {
  milestone?: unknown;
}): string | null {
  const milestone = first(row.milestone as { plan?: unknown } | { plan?: unknown }[]);
  const plan = first(milestone?.plan as { goal?: unknown } | { goal?: unknown }[]);
  const goal = first(plan?.goal as { user_id?: string } | { user_id?: string }[]);
  return goal?.user_id ?? null;
}

function tasksFromRows(rows: Array<{
  id: string;
  status: string;
  due_at: string | null;
  milestone?: unknown;
}>): OpenScheduledTask[] {
  const out: OpenScheduledTask[] = [];
  for (const row of rows) {
    if (!isOpenScheduledTask(row)) continue;
    const userId = userIdFromTaskRow(row);
    if (!userId) continue;
    out.push({
      id: row.id,
      user_id: userId,
      due_at: row.due_at,
      status: row.status,
    });
  }
  return out;
}

async function persistPlan(
  supabase: SupabaseClient,
  tasks: OpenScheduledTask[],
  existing: ExistingReminder[],
  leadByUser: Map<string, number>,
  now: Date,
): Promise<{ created: number; updated: number }> {
  const { inserts, updates } = planAutoReminders(tasks, existing, leadByUser, 15, now);
  if (inserts.length > 0) {
    const { error } = await supabase.from("reminder_schedules").insert(inserts);
    if (error) throw error;
  }
  for (const patch of updates) {
    const { error } = await supabase
      .from("reminder_schedules")
      .update({ remind_at: patch.remind_at, lead_minutes: patch.lead_minutes })
      .eq("id", patch.id);
    if (error) throw error;
  }
  return { created: inserts.length, updated: updates.length };
}

/** Authenticated user — RLS scopes tasks and reminders to them. */
export async function ensureDueReminders(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ created: number; updated: number }> {
  const now = new Date();
  // Prune reminders whose time has already passed so nothing stale lingers.
  await deletePastReminders(supabase, userId, now).catch(() => undefined);
  const settings = await getNotificationSettings(supabase, userId);
  const lead = settings.default_lead_minutes ?? 15;

  const [{ data: taskRows, error: taskError }, { data: reminderRows, error: remError }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, status, due_at, milestone:milestones(plan:plans(goal:goals(user_id)))",
        )
        .not("due_at", "is", null),
      supabase
        .from("reminder_schedules")
        .select("id, task_id, remind_at, enabled, delivered, lead_minutes")
        .eq("user_id", userId)
        .eq("delivered", false),
    ]);
  if (taskError) throw taskError;
  if (remError) throw remError;

  const tasks = tasksFromRows(taskRows ?? []).map((t) => ({
    ...t,
    user_id: userId,
  }));
  return persistPlan(
    supabase,
    tasks,
    (reminderRows ?? []) as ExistingReminder[],
    new Map([[userId, lead]]),
    now,
  );
}

/** Service-role dispatcher — covers every user so closed-tab send works. */
export async function ensureDueRemindersForAllUsers(
  supabase: SupabaseClient,
): Promise<{ created: number; updated: number }> {
  const [{ data: taskRows, error: taskError }, { data: reminderRows, error: remError }, { data: settingsRows, error: setError }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, status, due_at, milestone:milestones(plan:plans(goal:goals(user_id)))",
        )
        .not("due_at", "is", null)
        .limit(2000),
      supabase
        .from("reminder_schedules")
        .select("id, task_id, remind_at, enabled, delivered, lead_minutes")
        .eq("delivered", false)
        .limit(4000),
      supabase
        .from("notification_settings")
        .select("user_id, default_lead_minutes"),
    ]);
  if (taskError) throw taskError;
  if (remError) throw remError;
  if (setError) throw setError;

  const leadByUser = new Map<string, number>();
  for (const row of settingsRows ?? []) {
    leadByUser.set(
      (row as { user_id: string }).user_id,
      (row as { default_lead_minutes?: number }).default_lead_minutes ?? 15,
    );
  }

  return persistPlan(
    supabase,
    tasksFromRows((taskRows ?? []) as Array<{
      id: string;
      status: string;
      due_at: string | null;
      milestone?: unknown;
    }>),
    (reminderRows ?? []) as ExistingReminder[],
    leadByUser,
    new Date(),
  );
}
