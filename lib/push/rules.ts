import type { NotificationSettings } from "@/types/db";
import { isWithinQuietHours } from "@/lib/notifications/quietHours";

/**
 * Pure dispatch rules (Phase D). No server-only imports — unit-testable.
 * Decides whether a due reminder should be pushed right now.
 */

export interface ReminderForDispatch {
  id: string;
  user_id: string;
  remind_at: string;
  task_id: string | null;
  task_title: string | null;
  task_status: string | null;
  goal_id: string | null;
}

export type DispatchDecision =
  | "send"
  | "skip_settings"
  | "skip_quiet_hours"
  | "skip_task_done";

export function classifyReminder(
  reminder: ReminderForDispatch,
  settings: Pick<
    NotificationSettings,
    "enabled" | "channels" | "quiet_hours"
  > | null,
  now: Date = new Date(),
): DispatchDecision {
  if (reminder.task_status === "done" || reminder.task_status === "skipped") {
    return "skip_task_done";
  }
  if (!settings?.enabled) return "skip_settings";
  if (settings.channels && settings.channels.push === false) {
    return "skip_settings";
  }
  if (isWithinQuietHours(settings.quiet_hours ?? null, now)) {
    return "skip_quiet_hours";
  }
  return "send";
}
