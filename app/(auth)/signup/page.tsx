"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClass } from "@/lib/ui/field";

export default function SignupPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/callback",
        },
      });
      if (error) throw error;
      if (data.session) {
        setLeaving(true);
        window.setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 350);
      } else {
        setNotice("Check your email to confirm your account, then sign in.");
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="p-8">
        <h1 className="text-xl font-semibold text-slate-900">Create account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Start turning your goals into executed action.
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
          {notice ? (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {notice}
            </p>
          ) : null}

          <Button type="submit" loading={loading} className="w-full">
            Create account
          </Button>
        </form>

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
