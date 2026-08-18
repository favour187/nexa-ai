import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, isSupabaseConfigured } from "@/lib/env";
import { ConfigurationError } from "@/lib/db/errors";

/**
 * Server Supabase client bound to the request cookies (for auth session + RLS).
 * The `setAll` callback is wrapped because it can be invoked from a Server
 * Component where cookies are read-only; the middleware refreshes the session
 * in that case. (Supabase SSR recommended pattern.)
 */
export function createClient() {
  if (!isSupabaseConfigured) {
    throw new ConfigurationError(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  const cookieStore = cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies are read-only;
            // the middleware refreshes the session in that case.
          }
        },
      },
    },
  );
}

/** Returns a client or null (never throws). */
export async function tryCreateClient() {
  try {
    return createClient();
  } catch {
    return null;
  }
}
