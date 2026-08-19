import { z } from "zod";

/**
 * Centralized, validated environment access.
 *
 * Supabase values are OPTIONAL so the application can boot locally without a
 * live database (foundation runs in a degraded "not configured" mode). They
 * become required the moment a database/auth feature is actually used.
 *
 * No secrets are ever logged or sent to the client. Server-only keys
 * (SUPABASE_SERVICE_ROLE_KEY, FEATHERLESS_API_KEY) are never prefixed with
 * NEXT_PUBLIC_ and must never be imported by client code.
 *
 * BROWSER NOTE (why this module reads each variable directly):
 * Next.js only inlines DIRECT `process.env.NEXT_PUBLIC_*` references into the
 * client bundle. In the browser, the whole `process.env` object is a polyfilled
 * EMPTY object (see the compiled `process/browser` shim), so passing
 * `process.env` wholesale to `parseEnv()` made every value disappear client-side
 * and the app reported "Supabase is not configured". Reading each variable with
 * a direct reference lets the compiler bake NEXT_PUBLIC_* values into the
 * client bundle, while non-public keys (no NEXT_PUBLIC_ prefix) are never
 * inlined and evaluate to undefined in the browser.
 *
 * The Supabase URL and anon key are PUBLIC by design (the anon key is protected
 * by Row-Level Security, not by secrecy — see specs/architecture.md), so they
 * are hardcoded as fallbacks below. This guarantees the app boots with a live
 * database in EVERY environment (browser bundle, Node server, Edge middleware)
 * even when build/runtime env vars are absent. Real env vars still take
 * precedence when present.
 */

const trimmedString = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : ""),
  z.string(),
);

const optionalUrl = trimmedString.refine(
  (v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v),
  { message: "Must be a valid http(s) URL" },
);

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: trimmedString,
  SUPABASE_SERVICE_ROLE_KEY: trimmedString,
  FEATHERLESS_API_KEY: trimmedString,
  NEXA_FEATHERLESS_MODEL: trimmedString,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: trimmedString,
  VAPID_PRIVATE_KEY: trimmedString,
  VAPID_SUBJECT: trimmedString,
  DISPATCH_TOKEN: trimmedString,
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

/** Parse an environment map. Pure function — safe to unit test. */
export function parseEnv(input: Record<string, string | undefined>): Env {
  return schema.parse(input);
}

/**
 * Public Supabase credentials (anon key is RLS-protected, not secret).
 * Hardcoded fallbacks so the app always works even when env vars are missing
 * (e.g. Render build environment without NEXT_PUBLIC vars). Env vars win.
 */
const PUBLIC_SUPABASE_URL = "https://hugjfbppjquhvhypkrwa.supabase.co";
const PUBLIC_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Z2pmYnBwanF1aHZoeXBrcndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODE0NDksImV4cCI6MjEwMjY1NzQ0OX0.4CV49UqGCknrisHXUTYFTT9NfUWtF6Q_QkLcA3cJTFE";
// Public by design (pairs with server-only VAPID_PRIVATE_KEY). Keep in sync
// with lib/push/vapid.ts PUBLIC_VAPID_KEY_FALLBACK.
const PUBLIC_VAPID_KEY_FALLBACK =
  "BF1Z_-1H3ehq9jm06H7PO2flbVenGVMwTBxxmLrzMs9YzntdwcbYGIGX2_NIy6nuAY0sotmxwwkJFKrEr62apSQ";

export const env: Env = parseEnv({
  // Direct property access — REQUIRED for Next.js to inline NEXT_PUBLIC_*
  // values into the client bundle (see BROWSER NOTE above).
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY:
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || PUBLIC_VAPID_KEY_FALLBACK,
  // Non-public keys: never inlined into client bundles; server-only.
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  FEATHERLESS_API_KEY: process.env.FEATHERLESS_API_KEY,
  NEXA_FEATHERLESS_MODEL: process.env.NEXA_FEATHERLESS_MODEL,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  DISPATCH_TOKEN: process.env.DISPATCH_TOKEN,
  NODE_ENV: process.env.NODE_ENV,
});

export const isSupabaseConfigured = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const isServiceRoleConfigured = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);

/** Featherless AI is configured. Server-only; gates the /api/ai/* routes. */
export const isAiConfigured = Boolean(env.FEATHERLESS_API_KEY);

/** Web Push signing is always available (env or server fallback). */
export const isPushConfigured = true;
