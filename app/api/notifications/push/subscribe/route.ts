import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { upsertSubscription, deleteSubscription } from "@/lib/push/subscriptions";
import { setPushSubscribed } from "@/lib/db/notifications";
import { unauthorized, zodBadRequest } from "@/lib/api/http";

export const dynamic = "force-dynamic";

const base64url = z
  .string()
  .min(10)
  .max(500)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid key encoding");

const subscribeSchema = z.object({
  endpoint: z.string().url("Endpoint must be a valid URL").max(500),
  keys: z.object({
    p256dh: base64url,
    auth: base64url,
  }),
  user_agent: z.string().max(300).optional(),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url("Endpoint must be a valid URL").max(500),
});

/**
 * Web Push subscription management (Phase D — architecture.md §6).
 * Associate a device's push subscription with the authenticated user.
 * RLS scopes all writes to the user's own rows.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  await upsertSubscription(supabase, user.id, {
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    userAgent: parsed.data.user_agent,
  });

  // Reflect the subscription in the user's notification settings.
  await setPushSubscribed(supabase, user.id, true);

  return NextResponse.json({ ok: true });
}

/** Remove a device's subscription (user-initiated or app cleanup). */
export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  const supabase = await tryCreateClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  await deleteSubscription(supabase, user.id, parsed.data.endpoint);
  await setPushSubscribed(supabase, user.id, false);

  return NextResponse.json({ ok: true });
}
