import { Card } from "@/components/ui/Card";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        What should I do now?
      </h1>
      <p className="mt-1 text-slate-500">
        Your AI mentor and next-action recommendations arrive in a later phase.
      </p>

      <Card className="mt-6 p-8">
        <div className="flex items-start gap-4">
          <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            ✦
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Foundation phase
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              NEXA is running. Authentication, routing, and your goal workspace
              are available now. Adaptive planning and AI-driven recommendations
              are coming next.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Create a goal to get started —{" "}
              <a href="/goals" className="font-medium text-brand-600">
                go to Goals
              </a>
              .
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
