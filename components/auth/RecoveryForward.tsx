"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isRecoveryUrl, recoveryForwardTarget } from "@/lib/auth/recovery";






export function RecoveryForward() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/reset-password" || pathname === "/forgot-password") return;
    const search = window.location.search || "";
    const hash = window.location.hash || "";
    const blob = `${search} ${hash}`;
    if (/otp_expired|error_code=access_denied/i.test(blob)) {
      window.location.replace("/forgot-password?reason=expired");
      return;
    }
    if (isRecoveryUrl(pathname, search, hash)) {
      window.location.replace(recoveryForwardTarget(search, hash));
    }
  }, [pathname]);

  return null;
}
