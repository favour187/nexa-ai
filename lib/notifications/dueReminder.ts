/**
 * Pure helpers: every scheduled task gets a reminder at due time
 * (minus the user's default lead minutes). Custom reminders
 * (lead_minutes === null) are left alone.
 */

export const AUTO_REMINDER_CHANNEL = "web_notification" as const;

export interface OpenScheduledTask {
  id: string;
  user_id: string;
  due_at: string;
  status: string;
}

export interface ExistingReminder {
  id: string;
  task_id: string;
  remind_at: string;
  enabled: boolean;
  delivered: boolean;
  lead_minutes: number | null;
}

export interface AutoReminderInsert {
  user_id: string;
  task_id: string;
  remind_at: string;
  lead_minutes: number;
  channel: typeof AUTO_REMINDER_CHANNEL;
  enabled: true;
  delivered: false;
}

export interface AutoReminderUpdate {
  id: string;
  remind_at: string;
  lead_minutes: number;
}

const CLOSED = new Set(["done", "skipped"]);

export function isOpenScheduledTask(
  task: { due_at: string | null; status: string },
): task is { due_at: string; status: string } {
  return Boolean(task.due_at) && !CLOSED.has(task.status);
}

/** remind_at = due_at minus lead minutes (lead 0 = exactly when due). */
export function computeRemindAt(dueAtIso: string, leadMinutes: number): string {
  const due = new Date(dueAtIso).getTime();
  if (Number.isNaN(due)) return dueAtIso;
  const leadMs = Math.max(0, leadMinutes) * 60_000;
  return new Date(due - leadMs).toISOString();
}

export function planAutoReminders(
  tasks: OpenScheduledTask[],
  existing: ExistingReminder[],
  leadByUser: Map<string, number>,
  defaultLead = 15,
  now: Date = new Date(),
): { inserts: AutoReminderInsert[]; updates: AutoReminderUpdate[] } {
  const open = existing.filter((r) => !r.delivered);
  const byTask = new Map<string, ExistingReminder[]>();
  for (const row of open) {
    const list = byTask.get(row.task_id) ?? [];
    list.push(row);
    byTask.set(row.task_id, list);
  }

  const inserts: AutoReminderInsert[] = [];
  const updates: AutoReminderUpdate[] = [];

  for (const task of tasks) {
    if (!isOpenScheduledTask(task)) continue;
    const lead = leadByUser.get(task.user_id) ?? defaultLead;
    const remindAt = computeRemindAt(task.due_at, lead);
    const rows = byTask.get(task.id) ?? [];
    if (rows.length === 0) {
      // The reminder window has already passed — don't create a stale reminder
      // (also prevents recreate → fire → delete loops for overdue tasks).
      if (new Date(remindAt).getTime() < now.getTime()) continue;
      inserts.push({
        user_id: task.user_id,
        task_id: task.id,
        remind_at: remindAt,
        lead_minutes: lead,
        channel: AUTO_REMINDER_CHANNEL,
        enabled: true,
        delivered: false,
      });
      continue;
    }
    // A custom reminder (no lead_minutes) is the user's choice — do not add
    // or overwrite. Auto rows are kept in sync with due_at.
    if (rows.some((r) => r.lead_minutes === null)) continue;
    const auto = rows.find((r) => r.lead_minutes !== null && r.enabled);
    if (!auto) continue;
    if (auto.remind_at !== remindAt || auto.lead_minutes !== lead) {
      updates.push({ id: auto.id, remind_at: remindAt, lead_minutes: lead });
    }
  }

  return { inserts, updates };
}
