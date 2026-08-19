import { NextResponse, type NextRequest } from "next/server";
import { dispatchDueReminders } from "@/lib/push/dispatch";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Server-side reminder dispatch (Phase D — specs/notifications.md §5).
 *
 * This is the endpoint a scheduler hits (Render Cron, or an external pinger
 * such as UptimeRobot every few minutes) so reminders fire even when no
 * browser is open. It is idempotent and safe to call repeatedly:
 * - only enabled, undelivered, due reminders are considered,
 * - `delivered` is set only when a push actually succeeded,
 * - quiet hours, disabled settings, completed tasks, and dead endpoints are
 *   handled per lib/push/dispatch.ts.
 *
 * Optional protection: when DISPATCH_TOKEN is set in the environment, the
 * request must carry `x-dispatch-token` with the same value. Without it, the
 * endpoint still only reads/sends the user's own reminders (no cross-user
 * exposure) — the token just prevents random callers from triggering work.
 */
export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  const token = env.DISPATCH_TOKEN;
  if (token) {
    const provided = request.headers.get("x-dispatch-token") ?? "";
    if (provided !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await dispatchDueReminders();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Dispatch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
