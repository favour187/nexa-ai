"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/Brand";
import { NAV_LINKS, isNavLinkActive } from "@/components/layout/navLinks";

/**
 * Persistent desktop sidebar (Phase B). Same route set as the mobile drawer —
 * only routes that actually exist (components/layout/navLinks.ts).
 */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 md:flex">
      <div className="px-2 py-3">
        <Brand />
      </div>
      <nav className="mt-2 flex flex-col gap-1">
        {NAV_LINKS.map((link) => {
          const active = isNavLinkActive(link.href, pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
