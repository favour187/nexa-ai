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
 * Forgot password via phone OTP:
 *  1. Enter phone number → SMS code is sent.
 *  2. Verify the code → session is created (identity confirmed).
 *  3. Redirect to /reset-password, which lets the now-authenticated
 *     user set a new password.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("enter");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: "sms",
      });
      if (verifyError) throw verifyError;
      // Verified → session created. Go set a new password.
      router.push("/reset-password");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-8">
      <h1 className="text-xl font-semibold text-slate-900">
        {step === "verify" ? "Enter code" : "Reset password"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {step === "verify"
          ? `We sent a 6-digit code to ${phone}`
          : "Enter your phone number and we'll text you a verification code."}
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
            Verify
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
        <Link href="/login" className="font-medium text-brand-600">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
