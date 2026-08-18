import { tryCreateClient } from "@/lib/supabase/server";

/**
 * Returns the authenticated user for the current request, or null.
 * Never throws for a missing Supabase configuration (returns null instead).
 */
export async function getUser() {
  const supabase = await tryCreateClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}
