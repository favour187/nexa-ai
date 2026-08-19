import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { classifyReminder, type ReminderForDispatch } from "@/lib/push/rules";
import {
  isMissingPushTableError,
  readStoredDevices,
  upsertStoredDevice,
  removeStoredDevice,
} from "@/lib/push/devices";

function reminder(over: Partial<ReminderForDispatch> = {}): ReminderForDispatch {
  return {
    id: "r1",
    user_id: "u1",
    remind_at: "2026-08-19T09:00:00Z",
    task_id: "t1",
    task_title: "Easy 5 km run",
    task_status: "todo",
    goal_id: "g1",
    ...over,
  };
}

const settings = {
  enabled: true,
  channels: { push: true },
  quiet_hours: null,
};

describe("classifyReminder (Phase D dispatch rules)", () => {
  it("sends a due reminder when everything is fine", () => {
    expect(classifyReminder(reminder(), settings)).toBe("send");
  });

  it("skips when the master settings switch is off", () => {
    expect(
      classifyReminder(reminder(), { ...settings, enabled: false }),
    ).toBe("skip_settings");
  });

  it("skips when the push channel is explicitly disabled", () => {
    expect(
      classifyReminder(reminder(), { ...settings, channels: { push: false } }),
    ).toBe("skip_settings");
  });

  it("skips completed and skipped tasks (no notifications for done work)", () => {
    expect(
      classifyReminder(reminder({ task_status: "done" }), settings),
    ).toBe("skip_task_done");
    expect(
      classifyReminder(reminder({ task_status: "skipped" }), settings),
    ).toBe("skip_task_done");
  });

  it("skips reminders inside quiet hours", () => {
    const q = { start: "08:00", end: "10:00" };
    const at = new Date(2026, 7, 19, 9, 0);
    expect(
      classifyReminder(reminder(), { ...settings, quiet_hours: q }, at),
    ).toBe("skip_quiet_hours");
    const outside = new Date(2026, 7, 19, 11, 0);
    expect(
      classifyReminder(reminder(), { ...settings, quiet_hours: q }, outside),
    ).toBe("send");
  });

  it("skips when the user has no settings row (opt-in not confirmed)", () => {
    expect(classifyReminder(reminder(), null)).toBe("skip_settings");
  });
});

describe("fallback push device store", () => {
  it("detects a missing push_subscriptions table", () => {
    expect(isMissingPushTableError({ code: "PGRST205", message: "x" })).toBe(
      true,
    );
    expect(
      isMissingPushTableError({
        message: "Could not find the table 'public.push_subscriptions' in the schema cache",
      }),
    ).toBe(true);
    expect(isMissingPushTableError({ message: "permission denied" })).toBe(
      false,
    );
  });

  it("upserts and removes devices without dropping other channel flags", () => {
    const first = upsertStoredDevice({ in_app: true }, {
      endpoint: "https://push.example/a",
      p256dh: "p",
      auth: "s",
    });
    expect(first.in_app).toBe(true);
    expect(first.push).toBe(true);
    expect(readStoredDevices(first)).toHaveLength(1);

    const second = upsertStoredDevice(first, {
      endpoint: "https://push.example/b",
      p256dh: "p2",
      auth: "s2",
    });
    expect(readStoredDevices(second)).toHaveLength(2);

    const removed = removeStoredDevice(second, "https://push.example/a");
    const left = readStoredDevices(removed);
    expect(left).toHaveLength(1);
    expect(left[0].endpoint).toBe("https://push.example/b");
  });
});

describe("getServerVapidConfig", () => {
  it("returns signing material even when env vars are unset", async () => {
    const { getServerVapidConfig } = await import("@/lib/push/vapid-server");
    const previousPrivate = process.env.VAPID_PRIVATE_KEY;
    const previousSubject = process.env.VAPID_SUBJECT;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    const cfg = getServerVapidConfig();
    expect(cfg.privateKey.length).toBeGreaterThan(10);
    expect(cfg.subject.startsWith("mailto:")).toBe(true);
    expect(cfg.publicKey.length).toBeGreaterThan(20);
    if (previousPrivate === undefined) delete process.env.VAPID_PRIVATE_KEY;
    else process.env.VAPID_PRIVATE_KEY = previousPrivate;
    if (previousSubject === undefined) delete process.env.VAPID_SUBJECT;
    else process.env.VAPID_SUBJECT = previousSubject;
  });
});

describe("urlBase64ToUint8Array", () => {
  it("decodes standard base64url back to the original bytes", async () => {
    const { urlBase64ToUint8Array } = await import("@/lib/notifications/push");
    const original = new Uint8Array([0, 1, 2, 250, 251, 252, 127, 128]);
    let binary = "";
    for (const byte of original) binary += String.fromCharCode(byte);
    const base64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = urlBase64ToUint8Array(base64);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });
});
