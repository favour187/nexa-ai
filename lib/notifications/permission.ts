

export type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function getPermissionState(): PermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as PermissionState;
}





export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return (await Notification.requestPermission()) as PermissionState;
  } catch {
    return getPermissionState();
  }
}


export function showReminderNotification(title: string, body: string): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const options = {
    body,
    tag: "nexa-reminder",
    icon: "/icon-192.png",
    vibrate: [180, 80, 180],
  };
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    void navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, options))
      .catch(() => {
        try {
          new Notification(title, options);
        } catch {

        }
      });
    return;
  }
  try {
    new Notification(title, options);
  } catch {

  }
}
