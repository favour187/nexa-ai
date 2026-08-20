"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/Brand";
import { NavIcon } from "./navIcons";
import { NAV_LINKS, isNavLinkActive } from "@/components/layout/navLinks";

/**
 * Persistent desktop sidebar. Same route set as the mobile drawer — only
 * routes that actually exist (components/layout/navLinks.ts).
 */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/70 backdrop-blur-xl p-4 md:flex">
      <div className="px-2 py-3">
        <Brand />
        <p className="mt-1.5 px-0.5 text-[11px] font-medium text-slate-400">
          Don&apos;t just plan. <span className="text-gradient">Execute.</span>
        </p>
      </div>
      <nav className="mt-3 flex flex-col gap-1">
        {NAV_LINKS.map((link) => {
          const active = isNavLinkActive(link.href, pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-nexa",
                active
                  ? "bg-brand-gradient text-white shadow-glow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <NavIcon
                href={link.href}
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  active
                    ? "text-white"
                    : "text-slate-400 group-hover:text-brand-500",
                )}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
