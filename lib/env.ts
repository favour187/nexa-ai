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
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

/** Parse an environment map. Pure function — safe to unit test. */
export function parseEnv(input: Record<string, string | undefined>): Env {
  return schema.parse(input);
}

export const env: Env = parseEnv(
  process.env as Record<string, string | undefined>,
);

export const isSupabaseConfigured = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const isServiceRoleConfigured = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);

/** Featherless AI is configured. Reserved for Phase 2 (not used yet). */
export const isAiConfigured = Boolean(env.FEATHERLESS_API_KEY);
