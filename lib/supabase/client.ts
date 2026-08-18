import { createBrowserClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";
import { ConfigurationError } from "@/lib/db/errors";

/**
 * Browser (client) Supabase client. Imported only by client components.
 *
 * Throws a clear ConfigurationError if Supabase is not configured, rather than
 * constructing a client against an empty URL.
 */
export function createClient() {
  if (!isSupabaseConfigured) {
    throw new ConfigurationError(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Returns a client or null (never throws) — useful for graceful UI fallbacks. */
export function tryCreateClient() {
  try {
    return createClient();
  } catch {
    return null;
  }
}
