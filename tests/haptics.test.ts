import { describe, it, expect, vi, afterEach } from "vitest";
import { vibrateReminder } from "@/lib/notifications/haptics";

describe("vibrateReminder", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no-ops when vibrate is unavailable", () => {
    expect(() => vibrateReminder()).not.toThrow();
  });

  it("calls navigator.vibrate with the reminder pattern", () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal("navigator", { vibrate });
    vibrateReminder();
    expect(vibrate).toHaveBeenCalledWith([180, 80, 180]);
  });
});
