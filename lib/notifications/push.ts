import { getPublicVapidKey } from "@/lib/push/vapid";
import { requestNotificationPermission } from "@/lib/notifications/permission";
import { api } from "@/lib/api/client";












export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  return protocol === "https:" || host === "localhost" || host === "127.0.0.1";
}


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


export async function getPushSubscription(): Promise<PushSubscription | null> {
  const registration = await getRegistration();
  if (!registration) return null;
  try {
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}


export async function isPushSubscribed(): Promise<boolean> {
  return (await getPushSubscription()) !== null;
}





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
  } catch (error) {


    if (error && typeof error === "object" && "status" in error) {
      throw error;
    }
    return null;
  }
}


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
