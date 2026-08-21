import { type NextRequest } from "next/server";

const PROD_ORIGIN = "https://nexa-ai-t1ce.onrender.com";

/**
 * Resolve the PUBLIC origin of an incoming request.
 *
 * On proxied hosts (Render + Cloudflare, etc.) `request.url` reflects the
 * INTERNAL origin (e.g. https://localhost:10000), so redirects built from it
 * are unreachable from the browser. Use the forwarded host/proto headers
 * instead. Falls back to the deployed origin in production if the proxy did
 * not forward a public host (and to the raw host in local dev).
 */
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
