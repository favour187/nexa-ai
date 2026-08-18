import { type ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <Brand />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
