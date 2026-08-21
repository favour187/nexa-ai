"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isRecoveryUrl, recoveryForwardTarget } from "@/lib/auth/recovery";

/**
 * Password-reset emails sometimes open /login or / with tokens in the hash
 * (implicit) or ?code= (PKCE). Keep the user on the reset form instead of
 * the sign-in screen.
 */
export function RecoveryForward() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/reset-password") return;
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    if (isRecoveryUrl(pathname, search, hash)) {
      window.location.replace(recoveryForwardTarget(search, hash));
    }
  }, [pathname]);

  return null;
}
