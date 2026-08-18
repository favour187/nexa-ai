import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** Small HTTP response helpers shared by API routes. */

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function badRequest(message = "Bad request") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function serviceUnavailable(message = "Service not configured") {
  return NextResponse.json({ error: message }, { status: 503 });
}

export function zodBadRequest(error: ZodError) {
  return NextResponse.json(
    { error: "Invalid request", issues: error.issues },
    { status: 400 },
  );
}
