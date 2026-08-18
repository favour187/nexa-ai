import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { updateReminderSchema } from "@/lib/validation/reminders";
import { deleteReminder, getReminder, updateReminder } from "@/lib/db/reminders";
import { NotFoundError } from "@/lib/db/errors";
import {
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
  zodBadRequest,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  try {
    const reminder = await getReminder(supabase, user.id, params.id);
    if (!reminder) return notFound("Reminder not found");
    return NextResponse.json(reminder);
  } catch (error) {
    console.error("[reminders] load one failed", error);
    return serverError("Failed to load reminder");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

  const parsed = updateReminderSchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  try {
    const reminder = await updateReminder(
      supabase,
      user.id,
      params.id,
      parsed.data,
    );
    return NextResponse.json(reminder);
  } catch (error) {
    if (error instanceof NotFoundError) return notFound("Reminder not found");
    return serverError("Could not update the reminder");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  try {
    await deleteReminder(supabase, user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound("Reminder not found");
    return serverError("Could not delete the reminder");
  }
}
