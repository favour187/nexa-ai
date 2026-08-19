/**
 * VAPID public key for Web Push (Phase D — specs/notifications.md §3-§5).
 *
 * The PUBLIC key must reach the browser (it is baked into the client bundle
 * like the Supabase anon key — public by design). The PRIVATE key lives in
 * lib/push/vapid-server.ts and is never imported by client code.
 */

// Public fallback (generated for this project; safe to expose). Overridden by
// NEXT_PUBLIC_VAPID_PUBLIC_KEY when set.
export const PUBLIC_VAPID_KEY_FALLBACK =
  "BF1Z_-1H3ehq9jm06H7PO2flbVenGVMwTBxxmLrzMs9YzntdwcbYGIGX2_NIy6nuAY0sotmxwwkJFKrEr62apSQ";

/** Client-safe: the public key to pass to pushManager.subscribe(). */
export function getPublicVapidKey(): string {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || PUBLIC_VAPID_KEY_FALLBACK
  );
}
