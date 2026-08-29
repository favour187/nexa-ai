import { z } from "zod";






























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


export function parseEnv(input: Record<string, string | undefined>): Env {
  return schema.parse(input);
}






const PUBLIC_SUPABASE_URL = "https://hugjfbppjquhvhypkrwa.supabase.co";
const PUBLIC_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Z2pmYnBwanF1aHZoeXBrcndhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODE0NDksImV4cCI6MjEwMjY1NzQ0OX0.4CV49UqGCknrisHXUTYFTT9NfUWtF6Q_QkLcA3cJTFE";


const PUBLIC_VAPID_KEY_FALLBACK =
  "BF1Z_-1H3ehq9jm06H7PO2flbVenGVMwTBxxmLrzMs9YzntdwcbYGIGX2_NIy6nuAY0sotmxwwkJFKrEr62apSQ";

export const env: Env = parseEnv({


  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY:
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || PUBLIC_VAPID_KEY_FALLBACK,

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


export const isAiConfigured = Boolean(env.FEATHERLESS_API_KEY);


export const isPushConfigured = true;
