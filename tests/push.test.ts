import { describe, it, expect } from "vitest";
import { classifyReminder, type ReminderForDispatch } from "@/lib/push/rules";

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
