// Writes NEXT_PUBLIC env vars to .env.production before `next build`.
// These values are PUBLIC by design (the anon key is protected by Row-Level
// Security, not by secrecy; the VAPID public key is meant for the browser).
// Hardcoded as fallback so the client bundle always has them, even if Render's
// build environment doesn't expose the env vars.
import { writeFileSync } from "node:fs";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://hugjfbppjquhvhypkrwa.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Z2pmYnBwanF1aHZoeXBrcndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODE0NDksImV4cCI6MjEwMjY1NzQ0OX0.4CV49UqGCknrisHXUTYFTT9NfUWtF6Q_QkLcA3cJTFE";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BF1Z_-1H3ehq9jm06H7PO2flbVenGVMwTBxxmLrzMs9YzntdwcbYGIGX2_NIy6nuAY0sotmxwwkJFKrEr62apSQ";

const content =
  `NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}\n` +
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}\n` +
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}\n`;

writeFileSync(".env.production", content);

console.log("[env] .env.production written.");
console.log("[env] URL:", SUPABASE_URL);
console.log("[env] Key set:", SUPABASE_ANON_KEY ? "yes" : "no");
console.log("[env] VAPID public set:", VAPID_PUBLIC_KEY ? "yes" : "no");
