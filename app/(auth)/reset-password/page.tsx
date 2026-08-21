"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClass } from "@/lib/ui/field";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    const markReady = () => {
      if (settled) return;
      settled = true;
      setReady(true);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) markReady();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setExpired(true);
      setReady(true);
    }, 4000);

    return () => {
      listener.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex justify-center py-10">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (expired && !done) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Reset link expired</h1>
        <p className="mt-2 text-sm text-slate-500">
          This password reset link is missing or no longer valid. Request a new
          one and open it in the same browser.
        </p>
        <div className="mt-6">
          <Link href="/forgot-password">
            <Button>Request a new link</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Password updated</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your password has been changed. You can now sign in with your new password.
        </p>
        <div className="mt-6">
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <h1 className="text-xl font-semibold text-slate-900">Set new password</h1>
      <p className="mt-1 text-sm text-slate-500">
        Choose a new password for your account.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">New password</span>
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
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Button type="submit" loading={loading} className="w-full">
          Update password
        </Button>
      </form>
    </Card>
  );
}
