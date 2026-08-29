import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationSettings } from "@/types/db";
import type { NotificationSettingsInput } from "@/lib/validation/notifications";






const DEFAULT_SETTINGS = {
  enabled: true,
  channels: {} as Record<string, boolean>,
  quiet_hours: null,
  default_lead_minutes: 15,
  allow_ai_suggested_times: false,
  push_subscribed: false,
};


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

  const patch: Record<string, unknown> = {
    enabled: input.enabled,
    quiet_hours: input.quiet_hours ?? null,
    default_lead_minutes: input.default_lead_minutes,
    allow_ai_suggested_times: input.allow_ai_suggested_times,



  };
  if (input.channels !== undefined) {
    patch.channels = input.channels;
  }

  const { data, error } = await supabase
    .from("notification_settings")
    .update(patch)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as NotificationSettings;
}


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
