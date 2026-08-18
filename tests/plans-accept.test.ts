import { describe, it, expect } from "vitest";
import { acceptPlan } from "@/lib/db/plans";
import { NotFoundError } from "@/lib/db/errors";

/** Chainable thenable mock of the Supabase query builder. */
function mockChain(value: { data: unknown; error: unknown }) {
  const chain = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) =>
          Promise.resolve(value).then(resolve);
      }
      if (prop === "catch" || prop === "finally") return undefined;
      return () => chain;
    },
  });
  return { client: { from: () => chain } };
}

describe("acceptPlan", () => {
  it("promotes the plan to active and returns it", async () => {
    const { client } = mockChain({
      data: { id: "p1", status: "active" },
      error: null,
    });
    const plan = await acceptPlan(client as never, "p1");
    expect(plan.status).toBe("active");
  });

  it("throws NotFoundError when the update matches nothing (not owned)", async () => {
    const { client } = mockChain({ data: null, error: null });
    await expect(acceptPlan(client as never, "p1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rethrows database errors", async () => {
    const { client } = mockChain({ data: null, error: { message: "conflict" } });
    await expect(acceptPlan(client as never, "p1")).rejects.toEqual({
      message: "conflict",
    });
  });
});
