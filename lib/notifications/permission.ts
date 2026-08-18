/** Browser notification helpers (client-only at runtime; SSR-safe guards). */

export type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function getPermissionState(): PermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as PermissionState;
}

/**
 * Request notification permission. Only call this from an explicit user action
 * (specs/notifications.md §4) — never on page load.
 */
export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return (await Notification.requestPermission()) as PermissionState;
  } catch {
    return getPermissionState();
  }
}

/** Show a reminder via the Web Notifications API (only if permission granted). */
export function showReminderNotification(title: string, body: string): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: "nexa-reminder" });
  } catch {
    /* best-effort; some browsers require a service worker */
  }
}
