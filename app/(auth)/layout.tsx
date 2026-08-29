import { type ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { RecoveryForward } from "@/components/auth/RecoveryForward";






export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <RecoveryForward />
      <div aria-hidden className="nexa-mesh pointer-events-none absolute inset-0" />
      <div aria-hidden className="nexa-grid pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md">
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
