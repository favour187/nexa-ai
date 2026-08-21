"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Markdown } from "@/components/ui/Markdown";

const SUGGESTIONS = [
  "Explain async/await in JavaScript",
  "Write a Python function to dedupe a list",
  "What should I focus on today?",
  "Am I on track with my goals?",
];

type Message = { role: "user" | "assistant"; text: string };

export function MentorChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    // Send prior turns so the assistant has conversational memory.
    const history = messages.map((m) => ({ role: m.role, content: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setLoading(true);
    try {
      const reply = await api.sendMentorMessage(trimmed, undefined, history);
      setMessages((prev) => [...prev, { role: "assistant", text: reply.reply }]);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "NEXA could not respond. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  }

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-glow-sm">
          N
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">
            NEXA Assistant
          </h2>
          <p className="truncate text-xs text-slate-500">
            Ask anything — code, ideas, or help with your plan.
          </p>
        </div>
      </div>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="flex max-h-[60vh] min-h-[160px] flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6"
      >
        {messages.length === 0 ? (
          <div className="m-auto max-w-sm text-center">
            <p className="text-sm text-slate-500">
              Hi — I&apos;m NEXA. I can write code, explain concepts, brainstorm,
              and coach you on your goals. What do you need?
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={loading}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-gradient px-4 py-2.5 text-sm text-white shadow-glow-sm">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-xs font-bold text-white">
                  N
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <Markdown text={m.text} />
                  <SpeakButton text={m.text} className="mt-2" />
                </div>
              </div>
            ),
          )
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Spinner className="h-4 w-4 text-brand-600" /> NEXA is thinking…
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mx-4 mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700 sm:mx-6">
          {error}
        </p>
      ) : null}

      {/* Composer */}
      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 border-t border-slate-100 px-4 py-3 sm:px-6"
      >
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autosize();
          }}
          onKeyDown={onKeyDown}
          rows={1}
          aria-label="Ask NEXA"
          placeholder="Ask anything…  (Enter to send, Shift+Enter for a new line)"
          className="max-h-40 min-h-[44px] w-full min-w-0 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
        <Button
          type="submit"
          loading={loading}
          disabled={!input.trim()}
          className="h-11 shrink-0"
        >
          Send
        </Button>
      </form>
    </Card>
  );
}
