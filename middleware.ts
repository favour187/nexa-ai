import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { publicOrigin } from "@/lib/url";





export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const authError = url.searchParams.get("error_code") || url.searchParams.get("error");
  if (authError === "otp_expired" || authError === "access_denied") {
    const dest = new URL("/forgot-password", publicOrigin(request));
    dest.searchParams.set("reason", "expired");
    return NextResponse.redirect(dest);
  }





  if (url.searchParams.has("code") && url.pathname !== "/callback") {
    const callbackUrl = new URL("/callback", publicOrigin(request));
    url.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value);
    });
    const recoveryPath =
      url.pathname === "/reset-password" ||
      url.pathname === "/forgot-password" ||
      url.searchParams.get("type") === "recovery" ||
      url.searchParams.get("next") === "/reset-password";
    if (recoveryPath) {
      callbackUrl.searchParams.set("next", "/reset-password");
      callbackUrl.searchParams.set("type", "recovery");
    } else if (!callbackUrl.searchParams.get("next") && url.pathname !== "/") {
      callbackUrl.searchParams.set("next", url.pathname);
    }
    return NextResponse.redirect(callbackUrl);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [

    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map)$).*)",
  ],
};
