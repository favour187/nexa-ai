// Standalone database connectivity check.
// Run with:  npm run db:check
// (uses Node 20's --env-file to load .env.local)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error(
    "✗ Supabase env vars are not set. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
  );
  process.exit(2);
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const start = Date.now();
const { error } = await supabase.from("goals").select("id").limit(1);

if (error) {
  console.error(`✗ Database unreachable (${Date.now() - start}ms): ${error.message}`);
  process.exit(1);
}

console.log(`✓ Database reachable (${Date.now() - start}ms)`);
process.exit(0);
