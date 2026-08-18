# NEXA

> **Don't just plan. Execute.**

NEXA is an **AI-powered personal execution system**. It turns a plain-language
goal into a scheduled plan of milestones and tasks, keeps that plan alive as
circumstances change, and always tells you the single best thing to do right now.
Where a chatbot only talks and a calendar only stores, NEXA **drives execution** —
while keeping you in authority over every important decision.

Built for the **Pixel Forge AI Hackathon 2026**.

---

## ✨ Main features

- **Goals → Plans** — capture a goal in plain language; NEXA drafts milestones
  and scheduled tasks.
- **Adaptive replanning** — when tasks are missed or life changes, NEXA proposes
  an updated plan (never silently).
- **"What should I do now?"** — a single, context-aware next action with a
  one-line rationale.
- **AI mentor** — a chat that already knows your current task and deadline
  pressure.
- **What-if simulations** — rehearse alternative plans safely, without touching
  your real plan.
- **Behind-detection & recovery** — NEXA notices when you're slipping and
  proposes a recovery plan.
- **Deadline tracking & reminders** — track progress and get reminders within
  your device/browser's permissions.

> The AI **proposes**; the user **disposes**. NEXA never silently changes a
> deadline or deletes your data. See [`specs/ai.md`](./specs/ai.md).

## 🧠 Technology architecture overview

A deliberately narrow stack chosen for a fast hackathon build
([`specs/architecture.md`](./specs/architecture.md)):

| Layer | Technology |
|-------|-----------|
| Frontend + API | **Next.js** (App Router, TypeScript) |
| Database + Auth | **Supabase** (PostgreSQL, Row-Level Security, Auth) |
| AI inference | **Featherless AI** (OpenAI-compatible, server-side) |
| Spec guardrails | **Prelint** (product review on every PR) |
| Hosting | Vercel + Supabase |

```
Browser (Next.js) ──HTTPS──▶ Next.js API ──▶ Supabase Postgres (RLS)
                                   └───────▶ Featherless AI (server-only)
                            Service worker ◀── Web Push (best-effort)
```

## 🔌 Featherless AI's role

[Featherless AI](https://featherless.ai/) is NEXA's **core AI inference layer** —
a serverless, OpenAI-compatible API (`https://api.featherless.ai/v1`) giving
access to open-source models with no GPU management. NEXA calls it
**server-side only** (the API key never reaches the browser or the repo) to:
understand goals, break them into milestones/tasks, schedule and replan, pick the
next action, explain decisions, run what-ifs, detect slippage, and propose
recovery plans. Details: [`specs/ai.md`](./specs/ai.md).

## 🛡️ Prelint's role

[Prelint](https://prelint.com/) is our **product-review layer**. It reviews
**every pull request** against the specifications in [`specs/`](./specs),
flagging product drift, spec contradictions, conflicting technology choices, and
scope creep before they merge. It complements (it does not replace) code review.
Open-source projects use Prelint for free. Details:
[`specs/prelint.md`](./specs/prelint.md).

## 📁 Repository structure

```
nexa-ai/
├── README.md
├── LICENSE               # MIT
├── .gitignore
└── specs/                # Product & architecture specifications (v1)
    ├── product.md        # Problem, users, features, MVP scope
    ├── architecture.md   # Stack, data model, API, security
    ├── ai.md             # Featherless AI responsibilities & hard limits
    ├── notifications.md  # Reminders within real web-platform limits
    └── prelint.md        # How Prelint protects product intent
```

> The application source tree will be added once implementation begins.

## 🚧 Development status

**Specifications complete (v1); implementation not started.** The `specs/`
directory is the source of truth. No application features are built yet —
implementation will follow the specifications under Prelint review.

## 🔐 Security

This repository **never** contains secrets, API keys, or credentials (including
Featherless/Supabase keys). Secrets are server-side environment variables only.
See `.gitignore` and [`specs/architecture.md`](./specs/architecture.md).

## 📜 License

[MIT](./LICENSE) © 2026 NEXA Contributors.
