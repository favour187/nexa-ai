import { getPublicVapidKey } from "@/lib/push/vapid";
import { requestNotificationPermission } from "@/lib/notifications/permission";
import { api } from "@/lib/api/client";

/**
 * Client-side Web Push helpers (Phase D — specs/notifications.md §3-§5).
 *
 * All of this runs only in the browser, only on HTTPS (or localhost), and
 * only from explicit user actions. It never claims native-alarm capability:
 * the correct framing is "NEXA can deliver push notifications in the
 * background even when the NEXA webpage is not open, subject to browser/device
 * permissions and platform/network availability."
 */

/** Push needs a secure context + service workers + the Push API. */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  return protocol === "https:" || host === "localhost" || host === "127.0.0.1";
}

/** Standard base64url -> Uint8Array (required by pushManager.subscribe). */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64WithPadding = (base64 + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64WithPadding);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    await navigator.serviceWorker.register("/sw.js");
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/** The browser's current push subscription, if any. */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getRegistration();
  if (!registration) return null;
  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** True when this device is currently subscribed for push. */
export async function isPushSubscribed(): Promise<boolean> {
  return (await getPushSubscription()) !== null;
}

/**
 * Subscribe this device for background push. Returns the new subscription or
 * null when the user denied / the platform does not support it.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const registration = await getRegistration();
  if (!registration) return null;

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return null;

  try {
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(getPublicVapidKey()),
      }));

    const json = subscription.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return null;
    }
    await api.subscribePush(
      json.endpoint,
      json.keys.p256dh,
      json.keys.auth,
      navigator.userAgent,
    );
    return subscription;
  } catch {
    return null;
  }
}

/** Unsubscribe this device and remove the server-side row. */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const subscription = await getPushSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await api.unsubscribePush(endpoint);
    }
    return true;
  } catch {
    return false;
  }
}
