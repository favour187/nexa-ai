import type { QuietHours } from "@/types/db";

/**
 * Returns true if `now` falls within the user's quiet-hours window.
 *
 * Quiet hours use the server/browser local time (timezone in the setting is
 * informational for this MVP). A window that wraps past midnight (e.g. 22:00 →
 * 07:00) is handled. The delivery engine NEVER fires during quiet hours and the
 * AI is instructed to avoid them (specs/notifications.md §7, §8).
 */
export function isWithinQuietHours(
  quiet: QuietHours,
  now: Date = new Date(),
): boolean {
  if (!quiet || !quiet.start || !quiet.end) return false;

  const parse = (value: string): number => {
    const [h, m] = value.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return Number.NaN;
    return h * 60 + m;
  };

  const start = parse(quiet.start);
  const end = parse(quiet.end);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  if (start === end) return false;

  const current = now.getHours() * 60 + now.getMinutes();
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}
