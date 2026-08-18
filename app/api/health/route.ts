import { NextResponse } from "next/server";
import { isSupabaseConfigured, isServiceRoleConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { pingDatabase } from "@/lib/db/ping";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe. Always returns 200 (the process is up) and
 * reports the status of dependent services. Used to verify the backend is
 * running (specs/architecture.md, Phase 1 requirement #9).
 */
export async function GET() {
  const database = {
    configured: isSupabaseConfigured,
    reachable: false,
    latencyMs: null as number | null,
    error: null as string | null,
  };

  if (isSupabaseConfigured && isServiceRoleConfigured) {
    try {
      const admin = createAdminClient();
      const probe = await pingDatabase(admin);
      database.reachable = probe.reachable;
      database.latencyMs = probe.latencyMs;
      database.error = probe.error ?? null;
    } catch (error) {
      database.error = error instanceof Error ? error.message : "unknown error";
    }
  } else if (isSupabaseConfigured) {
    database.error = "service role key not configured";
  } else {
    database.error = "not configured";
  }

  return NextResponse.json(
    {
      status: database.configured && database.reachable ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        database,
        auth: { configured: isSupabaseConfigured },
      },
    },
    { status: 200 },
  );
}
