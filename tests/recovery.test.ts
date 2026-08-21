import { describe, it, expect } from "vitest";
import { isRecoveryUrl, recoveryForwardTarget } from "@/lib/auth/recovery";

describe("isRecoveryUrl", () => {
  it("treats type=recovery as a reset link", () => {
    expect(isRecoveryUrl("/login", "?code=abc&type=recovery")).toBe(true);
  });

  it("treats the reset-password path as recovery", () => {
    expect(isRecoveryUrl("/reset-password", "?code=abc")).toBe(true);
  });

  it("treats next=/reset-password as recovery", () => {
    expect(isRecoveryUrl("/callback", "?code=abc&next=/reset-password")).toBe(
      true,
    );
  });

  it("does not treat a normal login as recovery", () => {
    expect(isRecoveryUrl("/login", "")).toBe(false);
  });

  it("forwards hash tokens onto the reset page", () => {
    expect(
      recoveryForwardTarget("", "#access_token=tok&type=recovery"),
    ).toBe("/reset-password#access_token=tok&type=recovery");
  });
});
