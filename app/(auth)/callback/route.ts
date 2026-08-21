import { NextResponse, type NextRequest } from "next/server";
import { tryCreateClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");
  const err = url.searchParams.get("error_code") || url.searchParams.get("error");
  if (err === "otp_expired" || err === "access_denied") {
    return NextResponse.redirect(
      new URL("/forgot-password?reason=expired", publicOrigin(request)),
    );
  }

  // Password-reset links are "recovery" — route them to the reset page rather
  // than the dashboard. Works whether Supabase sent `type=recovery` or our own
  // `next=/reset-password` marker survived.
  const isRecovery =
    type === "recovery" || next === "/reset-password" || next === "recovery";
  const dest = isRecovery ? "/reset-password" : next ?? "/dashboard";

  let sessionReady = false;
  if (code) {
    const supabase = await tryCreateClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      sessionReady = !error;
    }
  }

  // Recovery must land on the reset form even if PKCE exchange failed here —
  // the browser may still have tokens in the URL hash. Other failed exchanges
  // go to sign in.
  const path = sessionReady || isRecovery ? dest : "/login";
  return NextResponse.redirect(new URL(path, publicOrigin(request)));
}
