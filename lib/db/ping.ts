import type { SupabaseClient } from "@supabase/supabase-js";

export interface DatabaseProbe {
  reachable: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * Lightweight database connectivity probe. Issues a minimal SELECT against the
 * `goals` table. Resolves within `timeoutMs` even if the network hangs.
 *
 * Pure with respect to its argument (the client is injected), so it is unit
 * testable with a mock.
 */
export async function pingDatabase(
  client: Pick<SupabaseClient, "from">,
  timeoutMs = 3000,
): Promise<DatabaseProbe> {
  const start = Date.now();

  const probe = client.from("goals").select("id").limit(1);

  const timeout = new Promise<{ error: { message: string } }>((resolve) =>
    setTimeout(
      () => resolve({ error: { message: `timed out after ${timeoutMs}ms` } }),
      timeoutMs,
    ),
  );

  const { error } = await Promise.race([probe, timeout]);

  if (error) {
    return { reachable: false, latencyMs: Date.now() - start, error: error.message };
  }

  return { reachable: true, latencyMs: Date.now() - start };
}
