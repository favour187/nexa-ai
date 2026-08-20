"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClass } from "@/lib/ui/field";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (!user) {
          router.push("/login");
        } else {
          setReady(true);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

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

  if (!ready) {
    return (
      <div className="flex justify-center py-10">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
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
