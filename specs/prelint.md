# Prelint Specification — NEXA

> **Status:** ✅ Approved draft v1.
> **Source of truth for Prelint's capabilities:** Prelint's official
> documentation (<https://prelint.com>). This spec does not assume capabilities
> beyond what Prelint documents.

## 1. What Prelint is (per official docs)

Prelint is a **product-review** tool that checks every pull request against a
repository's product **specifications**. It reviews **intent**, not
implementation correctness (bugs/security are handled by code-review tools).
Documented behaviors NEXA relies on:

- **Specs live in the repo** (Markdown/YAML/structured) alongside the code — for
  NEXA that is the `specs/` directory.
- **It activates on every PR** opened against the repo and posts findings inline,
  referencing the specific spec file and section.
- **It reports a status check** (e.g., `prelint/check`) on the PR.
- **It detects:** product decisions that contradict specs, features drifting from
  the roadmap, business rules silently rewritten, **contradictions between
  specs**, conflicting technology choices, duplicated effort, and gaps.
- **It complements code review** — it does not replace security/bug scanning.
- **Security model (documented):** tenant-isolated per-organization
  infrastructure, no cross-tenant data sharing, does not store raw source code
  or train on your code, TLS 1.2+ in transit, AES-256 at rest, least-privilege
  GitHub permissions.
- **Open-source projects are free** per Prelint's pricing (NEXA is MIT-licensed
  and public).

## 2. How Prelint is connected to NEXA

1. Install the **Prelint GitHub app** on the `nexa-ai` repository.
2. **Point Prelint at the spec files** — the `specs/` directory (`product.md`,
   `architecture.md`, `ai.md`, `notifications.md`, `prelint.md`).
3. From then on, Prelint reviews **every PR** (including this specifications PR)
   against those specs automatically.
4. Make `prelint/check` a **required status check** in branch protection on
   `main`, so PRs cannot merge while Prelint reports unresolved product-intent
   issues.

> Note: Prelint reviews against the specs **as written**. Keeping `specs/`
> precise and internally consistent is what makes Prelint effective.

## 3. The invariants Prelint must protect

These are the non-negotiable product requirements. A PR that violates any of them
should be a Prelint finding. They are stated in plain language so Prelint can
match them.

### 3.1 Authority / AI behavior (from ai.md §6)

- The AI must **propose**, not **apply**. No code path may silently change a
  **deadline**, **delete user data**, **overwrite an active plan**, or change
  settings without an accepted `ai_proposal`.
- All AI-driven data changes flow through `ai_proposals` → user accept/reject.
- The Featherless API key is **server-side only**, never in the client or repo.
- The AI must not provide medical/legal/financial/professional advice.

### 3.2 Security & privacy (from architecture.md §9, notifications.md §10)

- No secrets/credentials/API keys committed; `.gitignore` covers them.
- Per-user data isolation via Row-Level Security; `user_id` from the JWT, not
  from client input.
- Data minimization to the model (no unrelated PII; no secrets in prompts).
- HTTPS/TLS everywhere; logs contain no secrets.

### 3.3 Notifications (from notifications.md)

- Never claim native **alarm** or guaranteed delivery for the web app.
- No notification without explicit permission; respect `quiet_hours` and the
  master `enabled` switch; the AI/system never overrides them.
- AI-suggested reminder times require `allow_ai_suggested_times` and user
  acceptance.

### 3.4 Architecture (from architecture.md)

- The stack is **Next.js + Supabase + Featherless** (+ Prelint). Introducing a
  new vendor/framework/dependency is a spec-level decision and should be flagged.
- AI calls happen **server-side only**.
- One `active` plan per goal; new plans are drafts until accepted.

### 3.5 Scope (from product.md §9)

- No features from the "not in MVP" / "non-goals" lists (e.g., native mobile
  apps, multi-user collaboration, SMS/email/calendar integrations, payments)
  should appear without an accompanying spec change.

## 4. AI behavior requirements Prelint enforces

- A propose/apply boundary exists for every AI-driven mutation.
- Rationale is always produced and stored with proposals.
- What-if endpoints are read-only (no writes to goals/plans/tasks).
- Falling-behind handling is non-destructive (no automatic deadline changes).

## 5. Examples of changes that should trigger a Prelint finding

- A PR that changes `due_at` / `target_deadline` directly from an AI code path
  without going through a user-accepted proposal. *(violates 3.1)*
- A PR that calls Featherless from client-side code or hard-codes
  `FEATHERLESS_API_KEY`. *(violates 3.1, 3.2)*
- A PR adding notification/push logic that claims to "set the device alarm" or
  guarantees delivery. *(violates 3.3)*
- A PR that schedules a reminder inside `quiet_hours` or bypasses the `enabled`
  switch. *(violates 3.3)*
- A PR introducing a new database (e.g., MongoDB) or auth provider alongside
  Supabase without updating architecture.md. *(violates 3.4)*
- A PR adding multi-user sharing or SMS integration before the MVP. *(violates
  3.5)*
- A spec change in `specs/` that contradicts another spec (e.g., ai.md allowing
  silent deadline changes while this doc forbids it). *(contradiction)*

## 6. How developers respond to Prelint findings

1. **Read the finding** — Prelint cites the spec file + section it was checked
   against.
2. **Decide:**
   - **The code is wrong** → change the code to match the spec (preferred).
   - **The spec is wrong/outdated** → update `specs/` **in the same PR** so the
     product intent and the change agree, then let Prelint re-review.
3. **Never silence** a finding by weakening the spec to match unintended code.
   If the spec truly should change, say why.
4. Push updates; Prelint re-reviews automatically until the status check passes.
5. Merge only once `prelint/check` passes (required check on `main`).

## 7. Relationship to other specs

This document is the **enforcement layer**. The authoritative requirements live
in `product.md`, `architecture.md`, `ai.md`, and `notifications.md`. If those
change, the invariants in §3 must be updated to match — and Prelint will flag the
contradiction if they diverge.
