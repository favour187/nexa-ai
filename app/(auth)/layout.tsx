import { type ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";

/**
 * Shared auth layout (login + signup). The NEXA mark animates in, then the form
 * fades up just after — a short (~0.8s), premium, minimal entrance. Decorative
 * motion is disabled under prefers-reduced-motion (see globals.css).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label="NEXA home">
            <span className="animate-mark-in inline-block">
              <Brand />
            </span>
          </Link>
        </div>
        <div className="animate-fade-up-delayed">{children}</div>
      </div>
    </div>
  );
}
