import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerVapidConfig } from "@/lib/push/vapid-server";
import {
  listSubscriptionsForUsers,
  removeSubscriptionByEndpoint,
} from "@/lib/push/subscriptions";
import { classifyReminder, type ReminderForDispatch } from "@/lib/push/rules";
import { ensureDueRemindersForAllUsers } from "@/lib/db/autoReminders";
import type { NotificationSettings, PushSubscriptionRow } from "@/types/db";

/**
 * Background reminder dispatch (Phase D — specs/notifications.md §5).
 *
 * Runs server-side (Render Cron or an external pinger hitting
 * /api/notifications/dispatch) and does NOT depend on the browser being open.
 *
 * Honesty rules implemented here:
 * - A reminder is marked `delivered` ONLY when a push was actually sent
 *   successfully to at least one of the user's devices (never pre-marked).
 * - Disabled reminders, users with notifications disabled, tasks already
 *   completed, and quiet-hours windows are skipped.
 * - Dead endpoints (HTTP 404/410 from the push service) are removed.
 * - Nothing else is modified: no task status, no plan changes.
 *
 * NOTE (timezone): `remind_at` is stored as the UTC instant the user intended
 * (computed client-side in their local time), so firing times respect the
 * user's timezone. Quiet hours are applied here using the server clock (UTC);
 * the in-app engine still applies them in the browser's local time.
 */

export interface DispatchResult {
  checked: number;
  sent: number;
  failed: number;
  skipped: number;
  removedEndpoints: number;
  pushConfigured: boolean;
  tableReady: boolean;
}

export async function dispatchDueReminders(): Promise<DispatchResult> {
  const result: DispatchResult = {
    checked: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    removedEndpoints: 0,
    pushConfigured: false,
    tableReady: false,
  };

  const vapid = getServerVapidConfig();
  result.pushConfigured = Boolean(vapid.privateKey && vapid.subject);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return result;
  }
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  try {
    await ensureDueRemindersForAllUsers(admin);
  } catch {
    // Best-effort backfill — still send whatever reminder rows already exist.
  }

  const now = new Date();
  const { data: reminders, error } = await admin
    .from("reminder_schedules")
    .select(
      "id, user_id, remind_at, task:tasks(id, title, status, milestone:milestones(plan:plans(goal:goals(id))))",
    )
    .eq("enabled", true)
    .eq("delivered", false)
    .lte("remind_at", now.toISOString())
    .limit(500);
  if (error) throw error;

  const rows = (reminders ?? []) as unknown as Array<{
    id: string;
    user_id: string;
    remind_at: string;
    task:
      | { id: string; title: string | null; status: string | null;
          milestone: { plan: { goal: { id: string } | null } | null } | null }
      | null;
  }>;

  result.checked = rows.length;
  if (rows.length === 0) {
    result.tableReady = true;
    return result;
  }

  const userIds = [...new Set(rows.map((r) => r.user_id))];

  const [settingsRows, listed] = await Promise.all([
    admin
      .from("notification_settings")
      .select("user_id, enabled, channels, quiet_hours")
      .in("user_id", userIds),
    listSubscriptionsForUsers(admin, userIds),
  ]);
  if (settingsRows.error) throw settingsRows.error;
  result.tableReady = listed.tableReady;
  const settingsByUser = new Map<string, NotificationSettings>(
    ((settingsRows.data ?? []) as NotificationSettings[]).map((s) => [
      s.user_id,
      s,
    ]),
  );
  const subsByUser = new Map<string, PushSubscriptionRow[]>();
  for (const sub of listed.rows) {
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  for (const row of rows) {
    const reminder: ReminderForDispatch = {
      id: row.id,
      user_id: row.user_id,
      remind_at: row.remind_at,
      task_id: row.task?.id ?? null,
      task_title: row.task?.title ?? null,
      task_status: row.task?.status ?? null,
      goal_id: row.task?.milestone?.plan?.goal?.id ?? null,
    };

    const decision = classifyReminder(
      reminder,
      settingsByUser.get(row.user_id) ?? {
        enabled: true,
        channels: {},
        quiet_hours: null,
      },
      now,
    );
    if (decision !== "send") {
      result.skipped += 1;
      continue;
    }

    const subs = subsByUser.get(row.user_id) ?? [];
    if (subs.length === 0) {
      // No device subscribed — nothing to send, do NOT mark delivered (the
      // in-app engine may still show it while the app is open).
      result.skipped += 1;
      continue;
    }

    const title = "NEXA Reminder";
    const body = reminder.task_title
      ? `It's time to work on: ${reminder.task_title}`
      : "You have a task reminder.";
    const url = reminder.goal_id
      ? `/goals/${reminder.goal_id}?task=${reminder.task_id ?? ""}`
      : "/dashboard";
    const payload = JSON.stringify({
      title,
      body,
      url,
      tag: `nexa-${reminder.task_id ?? reminder.id}`,
    });

    let delivered = false;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_secret },
          },
          payload,
        );
        delivered = true;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          // Push service says the subscription is gone — clean it up.
          await removeSubscriptionByEndpoint(admin, sub.endpoint);
          result.removedEndpoints += 1;
        } else {
          result.failed += 1;
        }
      }
    }

    if (delivered) {
      // One-shot: delete after a successful push (mirrors the in-app engine),
      // so fired reminders don't pile up. Safe because planAutoReminders no
      // longer recreates reminders whose window has already passed.
      await admin
        .from("reminder_schedules")
        .delete()
        .eq("id", row.id);
      result.sent += 1;
    }
  }

  return result;
}
