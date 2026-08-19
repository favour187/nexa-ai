import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/Button";
import { ProductPreview } from "@/components/marketing/ProductPreview";
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
    <main className="relative min-h-screen overflow-hidden">
      <div aria-hidden className="nexa-mesh pointer-events-none absolute inset-0" />
      <div aria-hidden className="nexa-grid pointer-events-none absolute inset-0" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
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

      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-8 pt-8 lg:grid-cols-2 lg:pb-16 lg:pt-12">
        <div className="animate-fade-up">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            AI-powered personal execution system
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {tagline}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            NEXA turns a goal into a concrete, scheduled plan, keeps that plan
            alive as circumstances change, and always tells you the single best
            thing to do right now.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button>Go to dashboard</Button>
              </Link>
            ) : (
              <Link href="/signup">
                <Button>Get started</Button>
              </Link>
            )}
            <Link href="/login">
              <Button variant="secondary">I already have an account</Button>
            </Link>
          </div>
          <p className="mt-5 text-xs text-slate-400">
            The AI proposes. You dispose. No silent deadline changes.
          </p>
        </div>
        <div className="animate-fade-up-delayed">
          <ProductPreview />
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-20">
        <ul className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, i) => (
            <li
              key={feature.title}
              className={`rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-card backdrop-blur ${
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

      <footer className="relative border-t border-slate-200/80 py-6 text-center text-sm text-slate-400">
        NEXA · Pixel Forge AI Hackathon 2026
      </footer>
    </main>
  );
}
