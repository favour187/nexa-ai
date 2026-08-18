import { describe, it, expect, beforeEach } from "vitest";
import {
  rateLimit,
  _resetRateLimiterForTests,
} from "@/lib/ai/rateLimit";

describe("rateLimit (per-user AI rate limiting, architecture.md §9)", () => {
  beforeEach(() => _resetRateLimiterForTests());

  it("allows up to the max requests within the window", () => {
    for (let i = 0; i < 10; i++) {
      expect(rateLimit("u1").ok).toBe(true);
    }
    expect(rateLimit("u1").ok).toBe(false);
  });

  it("is independent per user", () => {
    for (let i = 0; i < 10; i++) rateLimit("u1");
    expect(rateLimit("u2").ok).toBe(true);
  });

  it("returns a positive retryAfter (seconds) when limited", () => {
    for (let i = 0; i < 10; i++) rateLimit("u1");
    const result = rateLimit("u1");
    expect(result.ok).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("respects a custom limit", () => {
    for (let i = 0; i < 2; i++) {
      expect(rateLimit("u3", { max: 2 }).ok).toBe(true);
    }
    expect(rateLimit("u3", { max: 2 }).ok).toBe(false);
  });
});
