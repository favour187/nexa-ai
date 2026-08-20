import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { tryCreateClient } from "@/lib/supabase/server";
import { createReminderSchema } from "@/lib/validation/reminders";
import { createReminder, deletePastReminders, listReminders } from "@/lib/db/reminders";
import { ensureDueReminders } from "@/lib/db/autoReminders";
import {
  notFound,
  serverError,
  serviceUnavailable,
  unauthorized,
  zodBadRequest,
} from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const supabase = await tryCreateClient();
  if (!supabase) return serviceUnavailable();

  const due = request.nextUrl.searchParams.get("due") === "true";

  try {
    if (!due) {
      // Listing all reminders (NOT the engine's due-only query): prune
      // anything past its time first so the list never shows stale entries.
      await deletePastReminders(supabase, user.id);
    }
    const reminders = await listReminders(supabase, user.id, { due });
    return NextResponse.json(reminders);
  } catch (error) {
    console.error("[reminders] load failed", error);
    return serverError("Failed to load reminders");
  }
}

export async function POST(request: NextRequest) {
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

  const parsed = createReminderSchema.safeParse(body);
  if (!parsed.success) return zodBadRequest(parsed.error);

  try {
    const reminder = await createReminder(supabase, user.id, parsed.data);
    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    const { NotFoundError } = await import("@/lib/db/errors");
    if (error instanceof NotFoundError) return notFound("Task not found");
    return serverError("Could not create the reminder");
  }
}
