// Reads NEXT_PUBLIC env vars from the build environment and writes them to
// .env.production so Next.js bakes them into the client bundle during `next build`.
// This fixes the issue where Render's env vars are available at runtime but not
// reliably inlined into the client JavaScript at build time.
import { writeFileSync } from "node:fs";

const vars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const lines = [];
for (const key of vars) {
  const value = process.env[key] ?? "";
  lines.push(`${key}=${value}`);
  console.log(`[env] ${key}: ${value ? "SET (" + value.substring(0, 20) + "...)" : "EMPTY"}`);
}

writeFileSync(".env.production", lines.join("\n") + "\n");
console.log("[env] .env.production written successfully.");
