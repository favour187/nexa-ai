import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushSubscriptionRow } from "@/types/db";
import { getNotificationSettings } from "@/lib/db/notifications";
import {
  isMissingPushTableError,
  readStoredDevices,
  removeStoredDevice,
  upsertStoredDevice,
} from "@/lib/push/devices";

/**
 * push_subscriptions data-access (Phase D — specs/architecture.md §4).
 *
 * Prefers the dedicated table. If migration 0005 has not been applied, devices
 * are stored on notification_settings.channels.push_devices so background
 * delivery still works.
 */

function toRow(
  userId: string,
  device: {
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent?: string | null;
  },
): PushSubscriptionRow {
  return {
    id: `fallback:${device.endpoint}`,
    user_id: userId,
    endpoint: device.endpoint,
    p256dh: device.p256dh,
    auth_secret: device.auth,
    user_agent: device.user_agent ?? null,
    created_at: new Date().toISOString(),
  };
}

export async function upsertSubscription(
  supabase: SupabaseClient,
  userId: string,
  input: { endpoint: string; p256dh: string; auth: string; userAgent?: string },
): Promise<PushSubscriptionRow> {
  const row = {
    user_id: userId,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth_secret: input.auth,
    user_agent: input.userAgent ?? null,
  };

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" })
    .select()
    .single();
  if (!error) return data as PushSubscriptionRow;
  if (!isMissingPushTableError(error)) throw error;

  const settings = await getNotificationSettings(supabase, userId);
  const channels = upsertStoredDevice(settings.channels, {
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    user_agent: input.userAgent ?? null,
  });
  const { error: updError } = await supabase
    .from("notification_settings")
    .update({ channels, push_subscribed: true })
    .eq("user_id", userId);
  if (updError) throw updError;
  return toRow(userId, {
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    user_agent: input.userAgent ?? null,
  });
}

export async function deleteSubscription(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  if (error && !isMissingPushTableError(error)) throw error;

  try {
    const settings = await getNotificationSettings(supabase, userId);
    const remaining = readStoredDevices(settings.channels).filter(
      (d) => d.endpoint !== endpoint,
    );
    const { error: updError } = await supabase
      .from("notification_settings")
      .update({
        channels: removeStoredDevice(settings.channels, endpoint),
        push_subscribed: remaining.length > 0,
      })
      .eq("user_id", userId);
    if (updError) throw updError;
  } catch {
    /* settings row may not exist */
  }
  return true;
}

export async function listSubscriptionsForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);
  if (!error) return (data ?? []) as PushSubscriptionRow[];
  if (!isMissingPushTableError(error)) throw error;

  const settings = await getNotificationSettings(supabase, userId);
  return readStoredDevices(settings.channels).map((d) => toRow(userId, d));
}

export async function listSubscriptionsForUsers(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<{ rows: PushSubscriptionRow[]; tableReady: boolean }> {
  if (userIds.length === 0) return { rows: [], tableReady: true };

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .in("user_id", userIds);

  const fromTable = !error ? ((data ?? []) as PushSubscriptionRow[]) : [];
  if (error && !isMissingPushTableError(error)) throw error;

  const { data: settingsRows, error: settingsError } = await supabase
    .from("notification_settings")
    .select("user_id, channels")
    .in("user_id", userIds);
  if (settingsError) throw settingsError;

  const seen = new Set(fromTable.map((r) => r.endpoint));
  const extra: PushSubscriptionRow[] = [];
  for (const row of settingsRows ?? []) {
    for (const device of readStoredDevices(
      (row as { channels?: unknown }).channels,
    )) {
      if (seen.has(device.endpoint)) continue;
      seen.add(device.endpoint);
      extra.push(toRow((row as { user_id: string }).user_id, device));
    }
  }

  return {
    rows: [...fromTable, ...extra],
    tableReady: !error,
  };
}

export async function removeSubscriptionByEndpoint(
  supabase: SupabaseClient,
  endpoint: string,
): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error && !isMissingPushTableError(error)) throw error;

  const { data: settingsRows } = await supabase
    .from("notification_settings")
    .select("user_id, channels");
  for (const row of settingsRows ?? []) {
    const devices = readStoredDevices((row as { channels?: unknown }).channels);
    if (!devices.some((d) => d.endpoint === endpoint)) continue;
    const remaining = devices.filter((d) => d.endpoint !== endpoint);
    await supabase
      .from("notification_settings")
      .update({
        channels: removeStoredDevice(
          (row as { channels?: unknown }).channels,
          endpoint,
        ),
        push_subscribed: remaining.length > 0,
      })
      .eq("user_id", (row as { user_id: string }).user_id);
  }
}
