import { NextResponse, type NextRequest } from "next/server";
import { tryCreateClient } from "@/lib/supabase/server";
import { publicOrigin } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");

  // Password-reset links are "recovery" — route them to the reset page rather
  // than the dashboard. Works whether Supabase sent `type=recovery` or our own
  // `next=/reset-password` marker survived.
  const isRecovery = type === "recovery" || next === "/reset-password";
  const dest = isRecovery ? "/reset-password" : next ?? "/dashboard";

  let sessionReady = false;
  if (code) {
    const supabase = await tryCreateClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      sessionReady = !error;
    }
  }

  // If the code exchange failed (expired/already-used link, or the PKCE
  // verifier cookie isn't present), send the user to sign in rather than to a
  // guarded page that would just bounce them anyway.
  return NextResponse.redirect(
    new URL(sessionReady ? dest : "/login", publicOrigin(request)),
  );
}
