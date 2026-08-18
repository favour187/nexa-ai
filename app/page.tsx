import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { getUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";

// Render per request so the CTA reflects the live auth state.
export const dynamic = "force-dynamic";

const tagline = "Don't just plan. Execute.";

const features = [
  "Goals become structured plans of milestones and tasks",
  "Plans adapt when life gets in the way",
  "An AI mentor that knows your current task",
  "A clear answer to what to do next",
];

export default async function HomePage() {
  const user = await getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Brand />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/dashboard">
              <Button size="sm">Open app</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="flex flex-1 flex-col justify-center py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          AI-powered personal execution system
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          {tagline}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          NEXA turns a goal into a concrete, scheduled plan, keeps that plan
          alive as circumstances change, and always tells you the single best
          thing to do right now.
        </p>

        <ul className="mt-8 grid max-w-2xl gap-2 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-1 text-brand-600">▸</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex gap-3">
          {user ? (
            <Link href="/dashboard">
              <Button>Go to dashboard</Button>
            </Link>
          ) : (
            <Link href="/signup">
              <Button>Get started</Button>
            </Link>
          )}
        </div>

        {!isSupabaseConfigured ? (
          <p className="mt-8 max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Running in foundation mode: Supabase is not configured, so sign-in
            and data features are unavailable until environment variables are
            set. See the README for local setup.
          </p>
        ) : null}
      </section>

      <footer className="border-t border-slate-200 py-6 text-sm text-slate-400">
        NEXA · Pixel Forge AI Hackathon 2026
      </footer>
    </main>
  );
}
