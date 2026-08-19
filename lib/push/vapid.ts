/**
 * VAPID keys for Web Push (Phase D — specs/notifications.md §3-§5).
 *
 * The PUBLIC key must reach the browser (it is baked into the client bundle
 * like the Supabase anon key — public by design). The PRIVATE key and the
 * contact subject are SERVER-ONLY environment variables and are never shipped
 * to the browser or committed to the repo.
 */

// Public fallback (generated for this project; safe to expose). Overridden by
// NEXT_PUBLIC_VAPID_PUBLIC_KEY when set.
export const PUBLIC_VAPID_KEY_FALLBACK =
  "BOZsh4z9G0ikDvTdd5ccgQK7V-TNiG4EsKCU_egYpwNSGBRqnGHnZ5jCWdDMLGdNVACHVzj8pifyKqjL41E3XQg";

/** Client-safe: the public key to pass to pushManager.subscribe(). */
export function getPublicVapidKey(): string {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || PUBLIC_VAPID_KEY_FALLBACK
  );
}

/** Server-only: full VAPID configuration, or null when not configured. */
export function getServerVapidConfig(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} | null {
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!privateKey || !subject) return null;
  return {
    publicKey: getPublicVapidKey(),
    privateKey,
    subject,
  };
}
