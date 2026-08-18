import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getPermissionState,
  requestNotificationPermission,
  showReminderNotification,
} from "@/lib/notifications/permission";

describe("notification permission", () => {
  afterEach(() => {
    (globalThis as { Notification?: unknown }).Notification = undefined;
  });

  it("reports unsupported when the Notifications API is absent", () => {
    expect(getPermissionState()).toBe("unsupported");
  });

  it("reflects the browser permission state", () => {
    const Notif = function Notif() {} as unknown as {
      new (title: string, options?: unknown): Notification;
      permission: NotificationPermission;
      requestPermission: () => Promise<NotificationPermission>;
    };
    Notif.permission = "denied";
    (globalThis as { Notification?: unknown }).Notification = Notif;
    expect(getPermissionState()).toBe("denied");
  });

  it("requests permission and returns the result", async () => {
    const Notif = function Notif() {} as unknown as {
      new (title: string, options?: unknown): Notification;
      permission: NotificationPermission;
      requestPermission: () => Promise<NotificationPermission>;
    };
    Notif.permission = "default";
    Notif.requestPermission = async () => "granted";
    (globalThis as { Notification?: unknown }).Notification = Notif;
    expect(await requestNotificationPermission()).toBe("granted");
  });

  it("only shows a notification when permission is granted", () => {
    const ctor = vi.fn();
    const Notif = function Notif() {
      ctor();
    } as unknown as {
      new (title: string, options?: unknown): Notification;
      permission: NotificationPermission;
    };
    Notif.permission = "denied";
    (globalThis as { Notification?: unknown }).Notification = Notif;
    showReminderNotification("t", "b");
    expect(ctor).not.toHaveBeenCalled();

    Notif.permission = "granted";
    showReminderNotification("t", "b");
    expect(ctor).toHaveBeenCalledTimes(1);
  });
});
