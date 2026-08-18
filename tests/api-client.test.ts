import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, ApiError } from "@/lib/api/client";

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("listGoals performs GET /api/goals and returns data", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify([{ id: "1" }]), { status: 200 }),
      );

    const result = await api.listGoals();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/goals",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
    expect(result).toEqual([{ id: "1" }]);
  });

  it("createGoal sends a POST with JSON body", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "g1" }), { status: 201 }),
      );

    const result = await api.createGoal({ title: "x", priority: "medium" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/goals",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual({ id: "g1" });
  });

  it("throws ApiError on a non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify({ error: "nope" }), { status: 401 }),
    );

    const result = api.listGoals();
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toThrow("nope");
  });
});
