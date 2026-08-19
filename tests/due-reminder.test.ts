import { describe, it, expect } from "vitest";
import {
  computeRemindAt,
  isOpenScheduledTask,
  planAutoReminders,
} from "@/lib/notifications/dueReminder";

describe("computeRemindAt", () => {
  it("subtracts lead minutes from due_at", () => {
    expect(computeRemindAt("2026-08-19T12:00:00.000Z", 15)).toBe(
      "2026-08-19T11:45:00.000Z",
    );
  });

  it("uses the due instant when lead is 0", () => {
    expect(computeRemindAt("2026-08-19T12:00:00.000Z", 0)).toBe(
      "2026-08-19T12:00:00.000Z",
    );
  });
});

describe("isOpenScheduledTask", () => {
  it("requires a due date and an open status", () => {
    expect(isOpenScheduledTask({ due_at: "2026-08-19T12:00:00Z", status: "todo" })).toBe(
      true,
    );
    expect(isOpenScheduledTask({ due_at: null, status: "todo" })).toBe(false);
    expect(
      isOpenScheduledTask({ due_at: "2026-08-19T12:00:00Z", status: "done" }),
    ).toBe(false);
    expect(
      isOpenScheduledTask({ due_at: "2026-08-19T12:00:00Z", status: "skipped" }),
    ).toBe(false);
  });
});

describe("planAutoReminders", () => {
  const task = {
    id: "t1",
    user_id: "u1",
    due_at: "2026-08-19T12:00:00.000Z",
    status: "todo",
  };
  const lead = new Map([["u1", 15]]);

  it("inserts a reminder when the task has none", () => {
    const { inserts, updates } = planAutoReminders([task], [], lead);
    expect(updates).toEqual([]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].task_id).toBe("t1");
    expect(inserts[0].remind_at).toBe("2026-08-19T11:45:00.000Z");
    expect(inserts[0].lead_minutes).toBe(15);
  });

  it("updates an auto reminder when due_at / lead drifted", () => {
    const { inserts, updates } = planAutoReminders(
      [task],
      [
        {
          id: "r1",
          task_id: "t1",
          remind_at: "2026-08-19T10:00:00.000Z",
          enabled: true,
          delivered: false,
          lead_minutes: 15,
        },
      ],
      lead,
    );
    expect(inserts).toEqual([]);
    expect(updates).toEqual([
      { id: "r1", remind_at: "2026-08-19T11:45:00.000Z", lead_minutes: 15 },
    ]);
  });

  it("does not overwrite a custom reminder", () => {
    const { inserts, updates } = planAutoReminders(
      [task],
      [
        {
          id: "r1",
          task_id: "t1",
          remind_at: "2026-08-19T08:00:00.000Z",
          enabled: true,
          delivered: false,
          lead_minutes: null,
        },
      ],
      lead,
    );
    expect(inserts).toEqual([]);
    expect(updates).toEqual([]);
  });

  it("skips done tasks", () => {
    const { inserts } = planAutoReminders(
      [{ ...task, status: "done" }],
      [],
      lead,
    );
    expect(inserts).toEqual([]);
  });
});
