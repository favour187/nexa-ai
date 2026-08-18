"use client";

import { NextActionCard } from "@/components/mentor/NextActionCard";
import { MentorChat } from "@/components/mentor/MentorChat";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        What should I do now?
      </h1>
      <p className="mt-1 text-slate-500">
        NEXA looks at your goals, deadlines, and available time and recommends the
        single best next action.
      </p>

      <div className="mt-6">
        <NextActionCard />
      </div>

      <div className="mt-8">
        <MentorChat />
      </div>
    </div>
  );
}
