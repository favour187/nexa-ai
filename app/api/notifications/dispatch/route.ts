import { NextResponse, type NextRequest } from "next/server";
import { dispatchDueReminders } from "@/lib/push/dispatch";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

















export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  const token = env.DISPATCH_TOKEN;
  if (token) {
    const provided = request.headers.get("x-dispatch-token") ?? "";
    if (provided !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await dispatchDueReminders();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Dispatch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
