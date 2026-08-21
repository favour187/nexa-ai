import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Runs on every matched request to refresh the Supabase auth session.
 * AuthN enforcement for protected routes happens in the (app) layout, not here.
 */
export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  // Auth email links (signup confirmation + password reset) sometimes land on
  // the home page when Supabase falls back to the Site URL instead of the
  // requested redirect. Funnel any ?code= to the dedicated /callback route so
  // the session is exchanged server-side and the user lands on the right page
  // (dashboard for signup, /reset-password for recovery).
  if (url.searchParams.has("code") && url.pathname !== "/callback") {
    const callbackUrl = url.clone();
    callbackUrl.pathname = "/callback";
    return NextResponse.redirect(callbackUrl);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match everything except static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map)$).*)",
  ],
};
