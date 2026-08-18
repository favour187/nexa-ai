import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured, isServiceRoleConfigured } from "@/lib/env";
import { ConfigurationError } from "@/lib/db/errors";

/**
 * Service-role (admin) client. SERVER-ONLY. Bypasses RLS and must never be
 * imported by client code (enforced by the `server-only` package). Used for
 * privileged operations such as the /api/health database probe.
 */
export function createAdminClient() {
  if (!isSupabaseConfigured || !isServiceRoleConfigured) {
    throw new ConfigurationError(
      "Supabase service-role client is not configured.",
    );
  }
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
