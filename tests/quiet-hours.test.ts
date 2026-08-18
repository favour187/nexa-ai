import { describe, it, expect } from "vitest";
import { isWithinQuietHours } from "@/lib/notifications/quietHours";

function at(hour: number, minute = 0): Date {
  return new Date(2026, 0, 1, hour, minute, 0);
}

describe("isWithinQuietHours", () => {
  it("is false when quiet hours are not set", () => {
    expect(isWithinQuietHours(null, at(12))).toBe(false);
  });

  it("treats equal start/end as no window", () => {
    expect(
      isWithinQuietHours({ start: "09:00", end: "09:00" }, at(12)),
    ).toBe(false);
  });

  it("detects a daytime window", () => {
    const q = { start: "09:00", end: "17:00" };
    expect(isWithinQuietHours(q, at(12))).toBe(true);
    expect(isWithinQuietHours(q, at(8))).toBe(false);
    expect(isWithinQuietHours(q, at(18))).toBe(false);
  });

  it("handles a window that wraps midnight", () => {
    const q = { start: "22:00", end: "07:00" };
    expect(isWithinQuietHours(q, at(23))).toBe(true);
    expect(isWithinQuietHours(q, at(6, 30))).toBe(true);
    expect(isWithinQuietHours(q, at(12))).toBe(false);
  });

  it("ignores malformed values", () => {
    expect(
      isWithinQuietHours({ start: "abc", end: "17:00" } as never, at(12)),
    ).toBe(false);
  });
});
