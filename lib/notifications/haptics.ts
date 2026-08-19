/**
 * Best-effort vibration when a reminder fires.
 * Uses the Vibration API while the tab is open. Background notifications may
 * also vibrate via the Web Notification `vibrate` option (Android Chrome).
 * iOS Safari, Focus/DND, and some desktop browsers ignore this — not an alarm.
 */

export const REMINDER_VIBRATE_PATTERN = [180, 80, 180] as const;

export function vibrateReminder(): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate([...REMINDER_VIBRATE_PATTERN]);
  } catch {
    /* unsupported or blocked */
  }
}
