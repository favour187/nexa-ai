import { tryCreateClient } from "@/lib/supabase/server";





export async function getUser() {
  const supabase = await tryCreateClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}
