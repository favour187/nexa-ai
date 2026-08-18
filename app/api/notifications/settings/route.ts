import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { notificationSettingsSchema } from "@/lib/validation/notifications";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/lib/db/notifications";
import {
  serverError,
  serviceUnavailable,
  unauthorized,
  zodBadRequest,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  try {
    const settings = await getNotificationSettings(supabase, user.id);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[notifications] load settings failed", error);
    return serverError("Failed to load settings");
  }
}

export async function PUT(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = notificationSettingsSchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  try {
    const settings = await updateNotificationSettings(
      supabase,
      user.id,
      parsed.data,
    );
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[notifications] save settings failed", error);
    return serverError("Failed to save settings");
  }
}
