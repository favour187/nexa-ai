/**
 * Navigation routes that ACTUALLY exist in the app (specs/architecture.md §6,
 * Phase B). Anchors point at real sections on the dashboard (#today = today's
 * tasks, #mentor = AI mentor chat). Only existing routes are listed.
 */
export const NAV_LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/goals/new", label: "New Plan" },
  { href: "/goals", label: "Goals" },
  { href: "/dashboard#today", label: "Tasks" },
  { href: "/reminders", label: "Reminders" },
  { href: "/what-if", label: "What-If" },
  { href: "/dashboard#mentor", label: "Assistant" },
  { href: "/settings", label: "Settings" },
] as const;

/** True when `pathname` matches a link (anchor-aware). */
export function isNavLinkActive(
  href: string,
  pathname: string,
): boolean {
  const [path, hash] = href.split("#");
  if (hash) {
    // Anchors are active only on their exact section page.
    return pathname === path;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
