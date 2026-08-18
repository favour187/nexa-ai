# NEXA

> **Don't just plan. Execute.**

NEXA is an AI-powered personal execution system that turns user goals into
actionable plans — and adapts them as life happens.

---

## 🚧 Project Status

**Scaffolding / Planning.** This repository has just been initialized.
NEXA's features are **not yet implemented**. Product and architecture
specifications are currently being drafted under [`specs/`](./specs).

This project is being built for the **Pixel Forge AI Hackathon 2026**.

---

## 🎯 Vision

NEXA is designed to do more than store a to-do list. Planned capabilities:

- **Goals → Plans:** Turn high-level user goals into structured, actionable plans.
- **Milestones & Tasks:** Break goals down into milestones and concrete tasks.
- **Adaptive Planning:** Automatically adapt the plan when tasks are missed or
  circumstances change.
- **AI Mentor:** An AI mentor that understands the context of your current task.
- **"What should I do now?":** Context-aware next-action recommendations.
- **What-If Simulations:** Explore alternative plans and outcomes before
  committing.
- **Deadline Tracking:** Track progress toward deadlines and surface risks early.
- **Notifications & Reminders:** Alarms/reminders where supported by the user's
  device and permissions.

## 🧠 Technology

- **[Featherless AI](https://featherless.ai/)** — core AI inference layer.
- **[Prelint](https://prelint.com/)** — keeps the implementation aligned with
  the specifications in [`specs/`](./specs), integrated into our development
  workflow.

## 📁 Repository Structure

```
nexa-ai/
├── README.md           # You are here
├── LICENSE             # MIT License
├── .gitignore
└── specs/              # Product & architecture specifications (drafts)
    ├── product.md
    ├── architecture.md
    ├── ai.md
    ├── notifications.md
    └── prelint.md
```

> The application source tree will be added once the technology stack is finalized.

## 🔐 Security

This repository must **never** contain secrets, API keys, or credentials
(including Featherless AI keys). Secrets are managed outside the repo (e.g.,
via environment variables / a secrets manager). See `.gitignore`.

## 📜 License

Distributed under the [MIT License](./LICENSE).
