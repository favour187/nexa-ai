"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClass } from "@/lib/ui/field";

type Step = "enter" | "verify";

/**
 * Sign up flow:
 *  1. Collect phone + email + password, send an SMS code to the phone.
 *  2. Verify the code → a phone account + session is created.
 *  3. Attach email + password to the account so the user can sign back in
 *     later with email + password (the login screen).
 */
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("enter");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // ── Step 1: send SMS code ───────────────────────────────────
  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify code, then set email + password ──────────
  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();

      // Verify the SMS code → creates the phone account + session.
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: "sms",
      });
      if (verifyError) throw verifyError;

      // Attach email + password so the user can sign in via email/password.
      const { error: updateError } = await supabase.auth.updateUser({
        email,
        password,
      });
      if (updateError) throw updateError;

      setLeaving(true);
      window.setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 350);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="p-8">
        <h1 className="text-xl font-semibold text-slate-900">
          {step === "verify" ? "Enter code" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {step === "verify"
            ? `We sent a 6-digit code to ${phone}`
            : "Verify your phone by SMS to get started."}
        </p>

        {step === "enter" ? (
          <form onSubmit={sendCode} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Phone number</span>
              <input
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={fieldClass}
                placeholder="+234 800 000 0000"
              />
            </label>
            <p className="-mt-2 text-xs text-slate-400">
              Include the country code (e.g. +234, +1).
            </p>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Password</span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldClass}
                placeholder="At least 8 characters"
              />
            </label>

            {error ? (
              <p
                role="alert"
                aria-live="polite"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" loading={loading} className="w-full">
              Send code
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">6-digit code</span>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={fieldClass + " text-center text-2xl tracking-[0.5em]"}
                placeholder="000000"
              />
            </label>

            {error ? (
              <p
                role="alert"
                aria-live="polite"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" loading={loading} className="w-full">
              Verify &amp; create account
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("enter");
                setCode("");
                setError(null);
              }}
              className="text-center text-sm text-brand-600"
            >
              ← Use a different number
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Sign in
          </Link>
        </p>
      </Card>

      {leaving ? (
        <div aria-hidden className="animate-fade-in fixed inset-0 z-50 bg-slate-50" />
      ) : null}
    </>
  );
}
