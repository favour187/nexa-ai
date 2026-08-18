"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // Branded intro animation (~1.9s). Skipped entirely under reduced motion.
  const reduced = usePrefersReducedMotion();
  const [intro, setIntro] = useState(true);
  const [introLeaving, setIntroLeaving] = useState(false);

  useEffect(() => {
    if (reduced) {
      setIntro(false);
      return;
    }
    const t1 = window.setTimeout(() => setIntroLeaving(true), 1500);
    const t2 = window.setTimeout(() => setIntro(false), 1900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reduced]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Smooth transition into the dashboard (fade overlay, then navigate).
      setLeaving(true);
      window.setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 350);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  const inputClass =
    "h-11 rounded-lg border border-slate-300 px-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <>
      {intro ? (
        <div
          aria-hidden
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-50 transition-opacity duration-500 ${
            introLeaving ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="flex flex-col items-center gap-5">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <span className="animate-nexa-ring absolute inset-0 rounded-2xl border-2 border-brand-400" />
              <span className="animate-mark-in-big flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-600 text-3xl font-bold text-white shadow-lg">
                N
              </span>
            </div>
            <span className="animate-fade-up-delayed text-xl font-semibold tracking-tight text-slate-900">
              NEXA
            </span>
            <span className="animate-fade-up-delayed-2 text-xs text-slate-400">
              {"Don't just plan. Execute."}
            </span>
          </div>
        </div>
      ) : null}

      <Card className="p-8">
        <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back. Sign in to continue to NEXA.
        </p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
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
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Need an account?{" "}
          <Link href="/signup" className="font-medium text-brand-600">
            Sign up
          </Link>
        </p>
      </Card>

      {leaving ? (
        <div aria-hidden className="animate-fade-in fixed inset-0 z-50 bg-slate-50" />
      ) : null}
    </>
  );
}
