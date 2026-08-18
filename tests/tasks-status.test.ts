import { describe, it, expect } from "vitest";
import { updateTaskStatus } from "@/lib/db/tasks";
import { NotFoundError } from "@/lib/db/errors";

/** Chainable thenable mock that captures the argument passed to `.update()`. */
function mockChain(value: { data: unknown; error: unknown }) {
  let updateArg: Record<string, unknown> | undefined;
  const chain = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) =>
          Promise.resolve(value).then(resolve);
      }
      if (prop === "catch" || prop === "finally") return undefined;
      if (prop === "update") {
        return (arg: Record<string, unknown>) => {
          updateArg = arg;
          return chain;
        };
      }
      return () => chain;
    },
  });
  return {
    client: { from: () => chain } as never,
    getUpdateArg: () => updateArg,
  };
}

describe("updateTaskStatus", () => {
  it("updates status + status_reason and returns the task", async () => {
    const { client, getUpdateArg } = mockChain({
      data: { id: "t1", status: "missed" },
      error: null,
    });
    const task = await updateTaskStatus(client, "t1", {
      status: "missed",
      reason: "No time",
    });
    expect(task.status).toBe("missed");
    expect(getUpdateArg()).toEqual({ status: "missed", status_reason: "No time" });
  });

  it("sets completed_at when marked done", async () => {
    const { client, getUpdateArg } = mockChain({
      data: { id: "t1", status: "done" },
      error: null,
    });
    await updateTaskStatus(client, "t1", { status: "done" });
    expect(getUpdateArg()).toHaveProperty("completed_at");
  });

  it("does NOT clear completed_at when leaving done (history preserved)", async () => {
    const { client, getUpdateArg } = mockChain({
      data: { id: "t1", status: "missed" },
      error: null,
    });
    await updateTaskStatus(client, "t1", { status: "missed" });
    expect(getUpdateArg()).not.toHaveProperty("completed_at");
  });

  it("throws NotFoundError when the task is not owned/found (RLS)", async () => {
    const { client } = mockChain({ data: null, error: null });
    await expect(
      updateTaskStatus(client, "t1", { status: "done" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
