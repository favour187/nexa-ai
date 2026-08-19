"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClass, textareaClass } from "@/lib/ui/field";
import type { Priority } from "@/types/db";

const priorities: Priority[] = ["low", "medium", "high"];

export default function NewGoalPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [targetDeadline, setTargetDeadline] = useState("");
  const [constraints, setConstraints] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api.createGoal({
        title,
        description: description.trim() ? description.trim() : undefined,
        priority,
        target_deadline: targetDeadline
          ? new Date(targetDeadline).toISOString()
          : undefined,
        constraints: constraints.trim() ? constraints.trim() : undefined,
      });
      router.push(`/goals/${result.goal.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create the goal",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/goals"
        className="text-sm font-medium text-brand-600 hover:underline"
      >
        ← Back to goals
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        New goal
      </h1>
      <p className="mt-1 text-slate-500">
        Describe what you want to achieve. NEXA will generate a draft plan you
        can review.
      </p>

      <Card className="mt-6 p-8">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Title</span>
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Run a half-marathon"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Description</span>
            <textarea
              maxLength={2000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={textareaClass}
              placeholder="Optional details about the goal"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">
              Constraints / available time
            </span>
            <textarea
              maxLength={2000}
              rows={2}
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              className={textareaClass}
              placeholder="e.g. 3 hours per week, weekends only"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={fieldClass}
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">
                Target deadline
              </span>
              <input
                type="datetime-local"
                value={targetDeadline}
                onChange={(e) => setTargetDeadline(e.target.value)}
                className={fieldClass}
              />
            </label>
          </div>

          {error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <p
            className={`text-xs text-slate-500 ${
              loading ? "animate-pulse-soft" : ""
            }`}
          >
            {loading
              ? "NEXA is thinking — generating your plan…"
              : "On submit, NEXA calls Featherless AI to draft a plan, then saves it as a draft."}
          </p>

          <div className="flex justify-end gap-2">
            <Link href="/goals">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={loading}>
              {loading ? "Generating plan…" : "Create goal & generate plan"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
