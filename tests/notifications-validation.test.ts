import { describe, it, expect } from "vitest";
import { notificationSettingsSchema } from "@/lib/validation/notifications";
import { createReminderSchema, updateReminderSchema } from "@/lib/validation/reminders";

const TASK_ID = "11111111-1111-1111-1111-111111111111";
const FUTURE = "2099-01-01T09:00:00Z";

describe("notificationSettingsSchema", () => {
  it("accepts valid settings", () => {
    expect(
      notificationSettingsSchema.parse({
        enabled: true,
        default_lead_minutes: 15,
        allow_ai_suggested_times: false,
      }).enabled,
    ).toBe(true);
  });

  it("rejects a negative default lead", () => {
    expect(() =>
      notificationSettingsSchema.parse({
        enabled: true,
        default_lead_minutes: -5,
        allow_ai_suggested_times: false,
      }),
    ).toThrow();
  });

  it("rejects a non-boolean enabled", () => {
    expect(() =>
      notificationSettingsSchema.parse({
        enabled: "yes",
        default_lead_minutes: 15,
        allow_ai_suggested_times: false,
      }),
    ).toThrow();
  });
});

describe("createReminderSchema", () => {
  it("accepts a valid future reminder", () => {
    expect(
      createReminderSchema.parse({ task_id: TASK_ID, remind_at: FUTURE })
        .task_id,
    ).toBe(TASK_ID);
  });

  it("rejects a reminder in the past", () => {
    expect(() =>
      createReminderSchema.parse({
        task_id: TASK_ID,
        remind_at: "2000-01-01T00:00:00Z",
      }),
    ).toThrow();
  });

  it("rejects a malformed datetime", () => {
    expect(() =>
      createReminderSchema.parse({
        task_id: TASK_ID,
        remind_at: "tomorrow at 9",
      }),
    ).toThrow();
  });

  it("rejects a non-uuid task_id", () => {
    expect(() =>
      createReminderSchema.parse({ task_id: "not-a-uuid", remind_at: FUTURE }),
    ).toThrow();
  });
});

describe("updateReminderSchema", () => {
  it("accepts a partial update", () => {
    expect(updateReminderSchema.parse({ enabled: false }).enabled).toBe(false);
  });

  it("rejects an empty update", () => {
    expect(() => updateReminderSchema.parse({})).toThrow();
  });
});
