




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


export function isNavLinkActive(
  href: string,
  pathname: string,
): boolean {
  const [path, hash] = href.split("#");
  if (hash) {

    return pathname === path;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
