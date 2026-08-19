import { NextResponse } from "next/server";
import {
  isSupabaseConfigured,
  isServiceRoleConfigured,
  isAiConfigured,
  isPushConfigured,
} from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { pingDatabase } from "@/lib/db/ping";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe. Always returns 200 (the process is up) and
 * reports the status of dependent services. Used to verify the backend is
 * running (specs/architecture.md, Phase 1 requirement #9).
 *
 * Never includes secrets, keys, stack traces, or PII.
 */
export async function GET() {
  const database = {
    configured: isSupabaseConfigured,
    reachable: false,
    latencyMs: null as number | null,
    error: null as string | null,
  };

  const push = {
    configured: isPushConfigured,
    tableReady: false as boolean | null,
  };

  if (isSupabaseConfigured && isServiceRoleConfigured) {
    try {
      const admin = createAdminClient();
      const probe = await pingDatabase(admin);
      database.reachable = probe.reachable;
      database.latencyMs = probe.latencyMs;
      database.error = probe.error ?? null;

      const table = await admin
        .from("push_subscriptions")
        .select("id")
        .limit(1);
      if (table.error) {
        const msg = table.error.message ?? "";
        push.tableReady = !(
          table.error.code === "PGRST205" ||
          msg.includes("schema cache") ||
          msg.includes("push_subscriptions")
        );
      } else {
        push.tableReady = true;
      }
    } catch (error) {
      database.error = error instanceof Error ? error.message : "unknown error";
    }
  } else if (isSupabaseConfigured) {
    database.error = "service role key not configured";
    push.tableReady = null;
  } else {
    database.error = "not configured";
    push.tableReady = null;
  }

  return NextResponse.json(
    {
      status: database.configured && database.reachable ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database,
        auth: { configured: isSupabaseConfigured },
        ai: { configured: isAiConfigured },
        push,
      },
    },
    { status: 200 },
  );
}
