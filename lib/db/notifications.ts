import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationSettings } from "@/types/db";
import type { NotificationSettingsInput } from "@/lib/validation/notifications";

/**
 * notification_settings data-access. Ownership is enforced by RLS
 * (user_id = auth.uid()) via the authenticated user's server client.
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  channels: {} as Record<string, boolean>,
  quiet_hours: null,
  default_lead_minutes: 15,
  allow_ai_suggested_times: false,
  push_subscribed: false,
};

/** Returns the user's settings, creating the default row on first access. */
export async function getNotificationSettings(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationSettings> {
  const { data: existing, error: selError } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (selError) throw selError;
  if (existing) return existing as NotificationSettings;

  const { data, error } = await supabase
    .from("notification_settings")
    .insert({ user_id: userId, ...DEFAULT_SETTINGS })
    .select()
    .single();
  if (error) {
    // A concurrent insert can race; fall back to reading the row.
    const { data: fallback } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (fallback) return fallback as NotificationSettings;
    throw error;
  }
  return data as NotificationSettings;
}

export async function updateNotificationSettings(
  supabase: SupabaseClient,
  userId: string,
  input: NotificationSettingsInput,
): Promise<NotificationSettings> {
  await getNotificationSettings(supabase, userId);

  const patch = {
    enabled: input.enabled,
    channels: input.channels ?? {},
    quiet_hours: input.quiet_hours ?? null,
    default_lead_minutes: input.default_lead_minutes,
    allow_ai_suggested_times: input.allow_ai_suggested_times,
    // push_subscribed is managed only by the push subscribe/unsubscribe endpoints.
  };

  const { data, error } = await supabase
    .from("notification_settings")
    .update(patch)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as NotificationSettings;
}

/** Managed ONLY by the push subscribe/unsubscribe endpoints (Phase D). */
export async function setPushSubscribed(
  supabase: SupabaseClient,
  userId: string,
  value: boolean,
): Promise<void> {
  await getNotificationSettings(supabase, userId);
  const { error } = await supabase
    .from("notification_settings")
    .update({ push_subscribed: value })
    .eq("user_id", userId);
  if (error) throw error;
}
