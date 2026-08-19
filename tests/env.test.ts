import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("uses defaults when nothing is provided", () => {
    const e = parseEnv({});
    expect(e.NEXT_PUBLIC_SUPABASE_URL).toBe("");
    expect(e.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("");
    expect(e.NODE_ENV).toBe("development");
  });

  it("trims whitespace", () => {
    const e = parseEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "  abc  " });
    expect(e.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("abc");
  });

  it("accepts a valid http(s) URL", () => {
    const e = parseEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" });
    expect(e.NEXT_PUBLIC_SUPABASE_URL).toBe("https://x.supabase.co");
  });

  it("rejects a malformed URL", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })).toThrow();
  });

  it("parses NODE_ENV", () => {
    expect(parseEnv({ NODE_ENV: "production" }).NODE_ENV).toBe("production");
    expect(() => parseEnv({ NODE_ENV: "staging" })).toThrow();
  });

  it("defaults Web Push / dispatch fields to empty strings", () => {
    const e = parseEnv({});
    expect(e.NEXT_PUBLIC_VAPID_PUBLIC_KEY).toBe("");
    expect(e.VAPID_PRIVATE_KEY).toBe("");
    expect(e.VAPID_SUBJECT).toBe("");
    expect(e.DISPATCH_TOKEN).toBe("");
  });

  it("trims VAPID and dispatch values", () => {
    const e = parseEnv({
      VAPID_PRIVATE_KEY: "  secret  ",
      VAPID_SUBJECT: "  mailto:ops@example.com  ",
      DISPATCH_TOKEN: "  token  ",
    });
    expect(e.VAPID_PRIVATE_KEY).toBe("secret");
    expect(e.VAPID_SUBJECT).toBe("mailto:ops@example.com");
    expect(e.DISPATCH_TOKEN).toBe("token");
  });
});
