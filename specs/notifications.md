# Notifications Specification — NEXA

> **Status:** ✅ Approved draft v1.
> **Platform reality:** the MVP is a **web application**. Web apps cannot ring
> the device's native alarm or guarantee delivery. This spec is intentionally
> honest about those limits.

## 1. Principles

1. **Permission-first.** No notification is shown without an explicit user
   grant.
2. **Best-effort, clearly labeled.** We never claim guaranteed delivery or
   native alarm capabilities the web does not have.
3. **User control.** The user can enable/disable, choose channels, set quiet
   hours, and opt out of AI-suggested times.
4. **No silent actions.** Notifications inform; they never change data.

## 2. Notification types

- **Task reminder** — "Time to do: \<task\>" before/at `due_at`.
- **Deadline approaching** — a goal/task deadline within a lead window.
- **Behind / recovery** — "You're falling behind on \<goal\>; review a recovery
  plan."
- **Next-action nudge** — optional, periodic "What should I do now?" prompt.

## 3. Channels & platform capabilities (MVP = web)

| Channel | When it works | Limitations |
|---|---|---|
| **In-app** | App tab is open | None while open; silent when closed. |
| **Web Notification** | Permission granted; tab open or service worker registered | Requires explicit permission; delivery depends on browser/OS; may be silenced by OS focus modes. |
| **Web Push** | Permission granted **and** push subscription stored | Best-effort via the browser push service; not delivered if push is disabled, in battery-saver, or under OS restrictions; no guaranteed latency. |

**What the web app CANNOT do (and we will not claim it can):**

- Set or ring the phone's **native alarm clock**.
- Override **Do Not Disturb / Focus / quiet modes**.
- Guarantee delivery when the app/tab is closed (push is best-effort).
- Access SMS, the system calendar, or other apps' notifications.
- Reliably wake a sleeping device.

> A future **native mobile app** could use local notifications + OS alarms. That
> is a **future feature**, explicitly out of MVP scope (product.md §9).

## 4. Notification permissions

- The app requests `Notification.permission` only in response to an explicit
  user action (e.g., tapping "Enable reminders"), **never** on page load.
- For push: after notification permission, register a service worker and create
  a Web Push subscription; store the subscription server-side.
- If permission is denied or revoked, the app falls back to **in-app only**
  reminders and clearly tells the user that reminders will only work while the
  app is open.
- The app re-checks permission status on focus and never assumes a grant lasts.

## 5. Scheduled reminders

- Reminders are derived from a task's `due_at` and the user's
  `default_lead_minutes` (e.g., remind 15 min before).
- **Scheduling authority lives server-side:** a lightweight scheduler (Vercel
  Cron / queue) reads `reminder_schedules` at due time and dispatches push/in-app
  notifications. The browser is **not** trusted as the sole scheduler (tabs
  close).
- **While the app is open:** client-side timers may fire reminders immediately
  for responsiveness, but the server scheduler is the source of truth for push
  delivery.

## 6. Alarm / reminder behavior

- Reminders are **visual + optional sound/vibration** via the Web Notifications
  API, subject to OS/browser behavior.
- There is **no native alarm**. The product copy must say "reminder," not
  "alarm," where the capability is web-based.
- Snooze / repeat is supported in-app only (the app must be open to repeat).

## 7. User-controlled settings (`notification_settings`)

- `enabled` — master switch.
- `channels` — which channels are active (in-app / web notification / push).
- `quiet_hours` — do-not-disturb window (start/end, timezone); reminders in this
  window are suppressed or deferred; the AI/system **never overrides** this.
- `default_lead_minutes` — default lead time before a task/deadline.
- `allow_ai_suggested_times` — whether the AI may propose per-task reminder times
  (**off by default**).
- Per-goal overrides (optional in MVP).

## 8. How the AI recommends reminder times

- The AI may **propose** a reminder time for a task (based on cadence, deadline
  pressure, and the user's typical availability) **only if**
  `allow_ai_suggested_times` is on.
- A proposed time is an `ai_proposal` (`kind: reminder_time`) that the user
  accepts.
- If the setting is off, the system uses `default_lead_minutes` exclusively.
- The AI never schedules a reminder inside `quiet_hours` and never overrides the
  master `enabled` switch.

## 9. What happens when a user misses a reminder

- Missing a **reminder** (it didn't fire / wasn't seen) does **not** change any
  data by itself.
- The underlying rule (ai.md §7) may mark a task `missed` once `due_at` passes;
  this is logged and reversible.
- When the user returns, NEXA surfaces missed items and, if slippage is
  significant, a **recovery plan proposal** (never an automatic deadline change).
- Repeated non-delivery should prompt the app to re-verify push/permission and
  inform the user that web delivery is best-effort.

## 10. Privacy requirements

- Push subscription endpoints/keys are stored server-side, scoped to the user,
  and used only to deliver the user's own reminders.
- Reminder content is derived from the user's own task data; no cross-user data.
- No analytics/tracking pixels in notifications.
- Notification settings and subscriptions are deleted when the user deletes their
  data (future "delete my data" flow — hard requirement before broad release).
- Compliance note: because delivery/permissions vary by platform, the UI must
  set accurate expectations rather than implying guaranteed contact.

## 11. Platform limitations summary

- Web Notifications: permission-gated, OS/browser-dependent, may be silenced.
- Web Push: best-effort, subscription-based, not guaranteed.
- No native alarms, no Do-Not-Disturb override, no SMS/calendar access, no
  reliable wake-from-sleep. Any feature depending on these is out of MVP scope.
