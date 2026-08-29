






export const REMINDER_VIBRATE_PATTERN = [180, 80, 180] as const;

export function vibrateReminder(): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate([...REMINDER_VIBRATE_PATTERN]);
  } catch {

  }
}
