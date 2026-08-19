import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushSubscriptionRow } from "@/types/db";

/**
 * push_subscriptions data-access (Phase D — specs/architecture.md §4).
 *
 * Browser flows use the AUTHENTICATED client (RLS scopes rows to the user).
 * The background scheduler uses the service-role client (lib/supabase/admin.ts)
 * to read any user's subscriptions and deliver their own reminders.
 */

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

  // One subscription per endpoint: if the user (re)subscribes from a device,
  // the row is reused rather than duplicated. RLS keeps this within the user's
  // own rows.
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" })
    .select()
    .single();
  if (error) throw error;
  return data as PushSubscriptionRow;
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
  if (error) throw error;
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
  if (error) throw error;
  return (data ?? []) as PushSubscriptionRow[];
}

/** All subscriptions across all users (scheduler only — service role). */
export async function listAllSubscriptions(
  supabase: SupabaseClient,
): Promise<Array<PushSubscriptionRow & { email?: string | null }>> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*, user:users(email)");
  if (error) throw error;
  return (data ?? []) as Array<PushSubscriptionRow & { email?: string | null }>;
}

export async function removeSubscriptionByEndpoint(
  supabase: SupabaseClient,
  endpoint: string,
): Promise<void> {
  // No user_id filter: called by the scheduler when the push service reports
  // the endpoint as gone (404/410) — service-role client, server-only.
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw error;
}
