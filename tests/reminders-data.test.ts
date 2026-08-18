import { describe, it, expect, vi } from "vitest";
import {
  applyReminderProposal,
  createReminder,
  deleteReminder,
  listReminders,
  updateReminder,
} from "@/lib/db/reminders";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/lib/db/notifications";
import { NotFoundError } from "@/lib/db/errors";

/** Single-value chainable thenable mock. */
function chain(value: { data: unknown; error: unknown }) {
  const c = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) =>
          Promise.resolve(value).then(resolve);
      }
      if (prop === "catch" || prop === "finally") return undefined;
      return () => c;
    },
  });
  return c;
}

describe("reminders data-access", () => {
  it("createReminder throws NotFound when the task is not owned/found", async () => {
    const supabase = { from: () => chain({ data: null, error: null }) } as never;
    await expect(
      createReminder(supabase, "u1", {
        task_id: "11111111-1111-1111-1111-111111111111",
        remind_at: "2099-01-01T09:00:00Z",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("createReminder inserts when the task is owned", async () => {
    const supabase = {
      from: (table: string) =>
        table === "tasks"
          ? chain({ data: { id: "t1" }, error: null })
          : chain({ data: { id: "r1", task_id: "t1" }, error: null }),
    } as never;
    const reminder = await createReminder(supabase, "u1", {
      task_id: "t1",
      remind_at: "2099-01-01T09:00:00Z",
    });
    expect(reminder.id).toBe("r1");
  });

  it("listReminders returns the data array", async () => {
    const supabase = {
      from: () => chain({ data: [{ id: "r1" }], error: null }),
    } as never;
    const result = await listReminders(supabase, "u1");
    expect(result).toEqual([{ id: "r1" }]);
  });

  it("updateReminder throws NotFound when nothing matches", async () => {
    const supabase = { from: () => chain({ data: null, error: null }) } as never;
    await expect(
      updateReminder(supabase, "u1", "r1", { enabled: false }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deleteReminder resolves on success", async () => {
    const supabase = { from: () => chain({ data: null, error: null }) } as never;
    await expect(deleteReminder(supabase, "u1", "r1")).resolves.toBeUndefined();
  });

  it("applyReminderProposal calls the rpc with the proposal id", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: true, reminder_id: "r1" },
      error: null,
    });
    const result = await applyReminderProposal({ rpc } as never, "p1");
    expect(result.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("apply_reminder_proposal", {
      p_proposal_id: "p1",
    });
  });
});

describe("notification settings data-access", () => {
  it("returns existing settings without inserting", async () => {
    const supabase = {
      from: () =>
        chain({ data: { user_id: "u1", enabled: true }, error: null }),
    } as never;
    const settings = await getNotificationSettings(supabase, "u1");
    expect(settings.enabled).toBe(true);
  });

  it("creates defaults when settings are absent", async () => {
    let calls = 0;
    const supabase = {
      from: () => {
        calls += 1;
        return chain(
          calls === 1
            ? { data: null, error: null }
            : {
                data: { user_id: "u1", enabled: true, allow_ai_suggested_times: false },
                error: null,
              },
        );
      },
    } as never;
    const settings = await getNotificationSettings(supabase, "u1");
    expect(settings.enabled).toBe(true);
  });

  it("updateNotificationSettings persists the patch", async () => {
    let calls = 0;
    const supabase = {
      from: () => {
        calls += 1;
        return chain(
          calls === 1
            ? { data: { user_id: "u1", enabled: true }, error: null }
            : { data: { user_id: "u1", enabled: false }, error: null },
        );
      },
    } as never;
    const settings = await updateNotificationSettings(supabase, "u1", {
      enabled: false,
      default_lead_minutes: 15,
      allow_ai_suggested_times: false,
    });
    expect(settings.enabled).toBe(false);
  });
});
