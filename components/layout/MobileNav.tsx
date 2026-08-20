"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/Brand";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/goals/new", label: "New Plan" },
  { href: "/goals", label: "Goals" },
  { href: "/dashboard#today", label: "Tasks" },
  { href: "/reminders", label: "Reminders" },
  { href: "/what-if", label: "What-If" },
  { href: "/dashboard#mentor", label: "AI Mentor" },
  { href: "/settings", label: "Settings" },
];

/** Mobile-only hamburger navigation. Simple conditional render — no
 *  transform animations that can break on some mobile browsers. */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      {/* Hamburger trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Drawer — conditionally rendered (no transform tricks) */}
      {open ? (
        <div className="fixed inset-0 z-50 flex">
          {/* Dark backdrop — tap to close */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/40"
          />

          {/* White panel */}
          <div className="relative flex h-full w-72 max-w-[85%] flex-col overflow-y-auto bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-3 py-3">
              <ul className="flex flex-col gap-0.5">
                {LINKS.map((link) => {
                  const path = link.href.split("#")[0];
                  const active = pathname === path || pathname.startsWith(`${path}/`);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "block rounded-lg px-4 py-3 text-[15px] font-medium",
                          active
                            ? "bg-brand-50 text-brand-700"
                            : "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Sign out at bottom */}
            <div className="border-t border-slate-200 px-4 py-3">
              <SignOutButton />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
