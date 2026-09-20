import { type NextRequest } from "next/server";

const PROD_ORIGIN = "https://thenexa-ai.xyz";

export function publicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host =
    forwardedHost || request.headers.get("host") || request.nextUrl.host || "";
  const proto = (
    request.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https")
  )
    .split(",")[0]
    .trim();

  const looksInternal =
    !host || host.startsWith("localhost") || host.startsWith("127.");
  if (looksInternal && process.env.NODE_ENV === "production") {
    return PROD_ORIGIN;
  }
  return `${proto}://${host}`;
}
