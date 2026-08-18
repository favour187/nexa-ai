import { describe, it, expect } from "vitest";
import { pingDatabase } from "@/lib/db/ping";

function clientReturning(result: { error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        limit: () => Promise.resolve(result),
      }),
    }),
  } as never;
}

describe("pingDatabase", () => {
  it("reports reachable when there is no error", async () => {
    const probe = await pingDatabase(clientReturning({ error: null }), 1000);
    expect(probe.reachable).toBe(true);
    expect(probe.error).toBeUndefined();
  });

  it("reports unreachable when the query errors", async () => {
    const probe = await pingDatabase(
      clientReturning({ error: { message: "relation not found" } }),
      1000,
    );
    expect(probe.reachable).toBe(false);
    expect(probe.error).toBe("relation not found");
  });

  it("reports unreachable when the query times out", async () => {
    const hangingClient = {
      from: () => ({
        select: () => ({
          limit: () => new Promise(() => {}),
        }),
      }),
    } as never;

    const probe = await pingDatabase(hangingClient, 200);
    expect(probe.reachable).toBe(false);
    expect(probe.error).toContain("timed out");
  });
});
