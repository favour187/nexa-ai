import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured, isServiceRoleConfigured } from "@/lib/env";
import { ConfigurationError } from "@/lib/db/errors";






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
