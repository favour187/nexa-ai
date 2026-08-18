import { describe, it, expect } from "vitest";
import { getGoal, listGoals } from "@/lib/db/goals";

/** Chainable thenable mock that records method calls. */
function mockChain(value: { data: unknown; error: unknown }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) =>
          Promise.resolve(value).then(resolve);
      }
      if (prop === "catch" || prop === "finally") return undefined;
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return chain;
      };
    },
  });
  return { client: { from: () => chain } as never, calls };
}

describe("ownership scoping (authorization at the data layer)", () => {
  it("getGoal scopes by both id and user_id", async () => {
    const { client, calls } = mockChain({ data: { id: "g1" }, error: null });
    await getGoal(client, "u1", "g1");

    const eqs = calls.filter((c) => c.method === "eq");
    expect(
      eqs.some((c) => c.args[0] === "user_id" && c.args[1] === "u1"),
    ).toBe(true);
    expect(eqs.some((c) => c.args[0] === "id" && c.args[1] === "g1")).toBe(true);
  });

  it("listGoals scopes by user_id", async () => {
    const { client, calls } = mockChain({ data: [], error: null });
    await listGoals(client, "u2");
    expect(
      calls.some(
        (c) => c.method === "eq" && c.args[0] === "user_id" && c.args[1] === "u2",
      ),
    ).toBe(true);
  });
});
