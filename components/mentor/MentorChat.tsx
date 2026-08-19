"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

const SUGGESTIONS = [
  "What should I do now?",
  "Am I falling behind?",
  "What should I focus on today?",
  "Why did you recommend this?",
  "How can I catch up?",
];

type Message = { role: "user" | "mentor"; text: string };

export function MentorChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    try {
      const reply = await api.sendMentorMessage(trimmed);
      setMessages((prev) => [...prev, { role: "mentor", text: reply.reply }]);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "The mentor could not respond",
      );
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(input);
  }

  return (
    <Card className="min-w-0 p-4 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">Ask the mentor</h2>
      <p className="mt-1 text-xs text-slate-500">
        Answers are grounded in your actual plan. The mentor will not invent
        progress.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            disabled={loading}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600 hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {messages.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "self-end rounded-lg bg-brand-600 px-3 py-2 text-sm text-white"
                  : "self-start rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800"
              }
            >
              {m.text}
            </div>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <Spinner className="h-4 w-4 text-brand-600" /> Thinking…
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Ask the mentor"
          placeholder="Ask anything about your plan…"
          className="h-11 w-full min-w-0 rounded-lg border border-slate-300 px-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Button
          type="submit"
          loading={loading}
          disabled={!input.trim()}
          className="w-full shrink-0 sm:w-auto"
        >
          Send
        </Button>
      </form>
    </Card>
  );
}
