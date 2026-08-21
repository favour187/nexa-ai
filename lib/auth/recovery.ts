/** True when this URL is a Supabase password-recovery callback. */
export function isRecoveryUrl(pathname: string, search: string, hash = ""): boolean {
  const q = `${search} ${hash} ${pathname}`;
  if (/otp_expired|access_denied|error_code/i.test(q)) return false;
  if (/type=recovery/i.test(q)) return true;
  if (pathname === "/reset-password") return true;
  if (/next=\/reset-password/i.test(q)) return true;
  if (/access_token=/i.test(hash) && !/type=signup/i.test(hash)) return true;
  return false;
}

export function recoveryForwardTarget(search: string, hash: string): string {
  return `/reset-password${search}${hash}`;
}
