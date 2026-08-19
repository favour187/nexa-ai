# Notifications Specification — NEXA

> **Status:** ✅ Approved draft v1.
> **Platform reality:** the MVP is a **web application**. Web apps cannot ring
> the device's native alarm or guarantee delivery. This spec is intentionally
> honest about those limits.
> **MVP delivery scope (shipped):** reminders are delivered **while the app is
> open** via in-app toasts and the browser Notification API (permission-gated,
> quiet-hours-aware). Web Push, a server-side scheduler, snooze, and
> sound/vibration are **documented future work — not part of the MVP build**
> (marked as such throughout this spec, in line with principle 2).

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
| **In-app toast** | App tab is open (engine polls ~30 s) | Silent when closed. |
| **Web Notification** | Permission granted; tab open | Requires explicit permission; delivery depends on browser/OS; may be silenced by OS focus modes. |
| **Web Push** *(future — NOT in MVP)* | Would require a service worker, VAPID keys, and stored subscriptions | Best-effort via the browser push service; not delivered if push is disabled, in battery-saver, or under OS restrictions; no guaranteed latency. Out of MVP scope — see §4, §5. |

**What the web app CANNOT do (and we will not claim it can):**

- Set or ring the phone's **native alarm clock**.
- Override **Do Not Disturb / Focus / quiet modes**.
- Guarantee delivery when the app/tab is closed (push is best-effort — and
  the MVP does not ship push at all).
- Access SMS, the system calendar, or other apps' notifications.
- Reliably wake a sleeping device.

> A future **native mobile app** could use local notifications + OS alarms. That
> is a **future feature**, explicitly out of MVP scope (product.md §9).

## 4. Notification permissions

- The app requests `Notification.permission` only in response to an explicit
  user action (e.g., tapping "Enable reminders"), **never** on page load.
- Push subscription (service worker + VAPID + server-side subscription storage)
  is **future work, not in MVP**. If it is added later, it must follow this
  section: request permission on user action only, store the subscription
  server-side scoped to the user, and never claim guaranteed delivery.
- If permission is denied or revoked, the app falls back to **in-app only**
  reminders and clearly tells the user that reminders will only work while the
  app is open.
- The app re-checks permission status on focus and never assumes a grant lasts.

## 5. Scheduled reminders

- Reminders are derived from a task's `due_at` and the user's
  `default_lead_minutes` (e.g., remind 15 min before).
- **MVP scheduling authority is client-side and open-tab-only:** the reminder
  engine polls `reminder_schedules` every ~30 s (and on window focus) while the
  app is open, fires due reminders, and marks them `delivered`. When the tab is
  closed nothing fires — this is an honest, documented MVP limit.
- **Future work (not in MVP):** a server-side scheduler (e.g., Render Cron /
  queue) reading `reminder_schedules` at due time and dispatching push
  notifications. If added, the browser engine stops being the sole scheduler.

## 6. Alarm / reminder behavior

- Reminders are **visual**: an in-app toast plus a browser notification (if
  permission granted). MVP has no sound/vibration — those are future work.
- There is **no native alarm**. The product copy must say "reminder," not
  "alarm," where the capability is web-based.
- Snooze / repeat is **future work, not in MVP** (the MVP reminder engine
  fires a due reminder once and marks it delivered).

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
- Marking a task `missed` is a **user action** in the MVP (the system never
  auto-marks tasks; see ai.md §7). It is logged and reversible via the task
  status control.
- When the user returns, NEXA surfaces missed items in the mentor context and
  next-action recommendation; if the user requests a replan, NEXA proposes an
  updated/recovery plan (never an automatic deadline change).
- If the user denied notification permission, the app clearly states reminders
  work only while the app is open and stays in-app-only.

## 10. Privacy requirements

- (Future) push subscription endpoints/keys must be stored server-side, scoped
  to the user, and used only to deliver the user's own reminders. Not
  applicable to the MVP build, which ships no push.
- Reminder content is derived from the user's own task data; no cross-user data.
- No analytics/tracking pixels in notifications.
- Notification settings (and any future subscriptions) are deleted when the
  user deletes their data (future "delete my data" flow — hard requirement
  before broad release).
- Compliance note: because delivery/permissions vary by platform, the UI must
  set accurate expectations rather than implying guaranteed contact.

## 11. Platform limitations summary

- Web Notifications: permission-gated, OS/browser-dependent, may be silenced;
  work only while the app is open.
- Web Push: **future work** (out of MVP scope) — best-effort, subscription-based,
  not guaranteed.
- No native alarms, no Do-Not-Disturb override, no SMS/calendar access, no
  reliable wake-from-sleep. Any feature depending on these is out of MVP scope.
