import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { getUser } from "@/lib/auth/session";

// Render per request so the CTA reflects the live auth state.
export const dynamic = "force-dynamic";

const tagline = "Don't just plan. Execute.";

const features = [
  {
    title: "Goals become plans",
    body: "Plain language in. Milestones and scheduled tasks out — as a draft you accept.",
  },
  {
    title: "Plans that adapt",
    body: "Miss a week? NEXA proposes a recovery. It never silently rewrites a deadline.",
  },
  {
    title: "An AI mentor that knows",
    body: "Chat that already has your current task, deadline pressure, and progress.",
  },
  {
    title: "Always a next action",
    body: "One recommended thing to do right now, with a one-line rationale.",
  },
];

export default async function HomePage() {
  const user = await getUser();

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <div aria-hidden className="nexa-mesh pointer-events-none absolute inset-0" />
      <div aria-hidden className="nexa-grid pointer-events-none absolute inset-0" />

      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-6">
        <Brand />
        <nav className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {user ? (
            <Link href="/dashboard">
              <Button size="sm">Open app</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="px-2.5 sm:px-3">
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

      <section className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 text-center sm:px-6 sm:py-14">
        <div className="animate-fade-up">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600 sm:text-sm sm:tracking-wide">
            AI-powered personal execution system
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:mt-4 sm:text-5xl">
            {tagline}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg">
            NEXA turns a goal into a concrete, scheduled plan, keeps that plan
            alive as circumstances change, and always tells you the single best
            thing to do right now.
          </p>
          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
            {user ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">Go to dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/signup" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">Get started</Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    Sign in
                  </Button>
                </Link>
              </>
            )}
          </div>
          <p className="mt-5 text-xs text-slate-400">
            The AI proposes. You dispose. No silent deadline changes.
          </p>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 sm:pb-16">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {features.map((feature, i) => (
            <li
              key={feature.title}
              className={`rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left shadow-card backdrop-blur sm:p-5 ${
                i === 0
                  ? "animate-fade-up"
                  : i === 1
                    ? "animate-fade-up-delayed"
                    : i === 2
                      ? "animate-fade-up-delayed-2"
                      : "animate-fade-up-delayed-3"
              }`}
            >
              <h2 className="text-sm font-semibold text-slate-900">
                {feature.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {feature.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="relative mt-auto border-t border-slate-200/80 px-4 py-5 text-center text-xs text-slate-400 sm:text-sm">
        NEXA · Pixel Forge AI Hackathon 2026
      </footer>
    </main>
  );
}
