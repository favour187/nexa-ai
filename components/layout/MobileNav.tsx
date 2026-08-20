"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";

const LINKS = [
  { href: "/dashboard", label: "🏠  Home" },
  { href: "/goals/new", label: "➕  New Plan" },
  { href: "/goals", label: "🎯  Goals" },
  { href: "/reminders", label: "⏰  Reminders" },
  { href: "/what-if", label: "🔮  What-If" },
  { href: "/settings", label: "⚙️  Settings" },
];

/** Dead-simple mobile menu: hamburger opens a full-screen white overlay
 *  with stacked links. No transforms, no flex, no absolute positioning. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (open) {
    return (
      <div className="fixed inset-0 z-50 block bg-white md:hidden">
        {/* Top bar with close */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <span className="text-lg font-bold text-slate-900">NEXA</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xl text-slate-600"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <nav className="px-4 py-4">
          <ul className="flex flex-col gap-1">
            {LINKS.map((link) => {
              const path = link.href.split("#")[0];
              const active = pathname === path || pathname.startsWith(path + "/");
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={
                      "block rounded-xl px-4 py-4 text-lg " +
                      (active
                        ? "bg-brand-50 font-semibold text-brand-700"
                        : "text-slate-700 hover:bg-slate-50")
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sign out */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 px-4 py-4">
          <SignOutButton />
        </div>
      </div>
    );
  }

  // Hamburger button
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open navigation menu"
      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}
