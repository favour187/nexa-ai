import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
} from "@/lib/db/goals";

/**
 * Builds a thenable, chainable mock of the Supabase query builder. Any method
 * call returns the same chain (so .from().select().eq().order()... works), and
 * awaiting the chain resolves to `value`. Method calls (with args) are recorded
 * in `calls` so tests can assert what was sent.
 */
function mockSupabase(value: unknown) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) =>
          Promise.resolve(value).then(resolve);
      }
      if (prop === "catch" || prop === "finally") {
        return undefined;
      }
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return chain;
      };
    },
  });

  const client = { from: () => chain } as unknown as SupabaseClient;
  return { client, calls };
}

describe("goals repository", () => {
  it("listGoals returns the data array", async () => {
    const { client } = mockSupabase({ data: [{ id: "1" }], error: null });
    const result = await listGoals(client, "u1");
    expect(result).toEqual([{ id: "1" }]);
  });

  it("listGoals throws on error", async () => {
    const { client } = mockSupabase({ data: null, error: { message: "boom" } });
    await expect(listGoals(client, "u1")).rejects.toEqual({ message: "boom" });
  });

  it("getGoal returns null when not found", async () => {
    const { client } = mockSupabase({ data: null, error: null });
    expect(await getGoal(client, "u1", "g1")).toBeNull();
  });

  it("createGoal inserts with user_id and status active", async () => {
    const { client, calls } = mockSupabase({
      data: { id: "g1", status: "active" },
      error: null,
    });
    const result = await createGoal(client, "u1", {
      title: "Run 10k",
      priority: "medium",
    });
    expect(result.id).toBe("g1");

    const inserted = calls.find((c) => c.method === "insert")!.args[0] as Record<
      string,
      unknown
    >;
    expect(inserted.user_id).toBe("u1");
    expect(inserted.status).toBe("active");
    expect(inserted.title).toBe("Run 10k");
  });

  it("updateGoal strips undefined fields", async () => {
    const { client, calls } = mockSupabase({
      data: { id: "g1", status: "paused" },
      error: null,
    });
    await updateGoal(client, "u1", "g1", { status: "paused", title: undefined });
    const patched = calls.find((c) => c.method === "update")!.args[0] as Record<
      string,
      unknown
    >;
    expect(patched).toEqual({ status: "paused" });
  });

  it("deleteGoal does not throw on success", async () => {
    const { client } = mockSupabase({ data: null, error: null });
    await expect(deleteGoal(client, "u1", "g1")).resolves.toBeUndefined();
  });
});
