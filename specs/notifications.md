# Notifications Specification — NEXA

> **Status:** ✅ Approved draft v1.
> **Platform reality:** the MVP is a **web application**. Web apps cannot ring
> the device's native alarm or guarantee delivery. This spec is intentionally
> honest about those limits.
> **MVP delivery scope (shipped):**
> - **In-app toasts + browser notifications** while the app is open
>   (permission-gated, quiet-hours-aware).
> - **Web Push background delivery** (Phase D) via a service worker, per-device
>   push subscriptions stored server-side, and a backend dispatch endpoint
>   (`/api/notifications/dispatch`) that fires due reminders even when the
>   NEXA webpage is closed — subject to browser/device permissions and
>   platform/network availability. Correct capability wording: "NEXA can
>   deliver push notifications in the background even when the NEXA webpage is
>   not open, subject to browser/device permissions and platform/network
>   availability." NEXA is NOT a native alarm clock.
> - A **short vibration pulse** is attempted when a reminder fires (Vibration
>   API while the tab is open; `vibrate` on the Web Notification / push payload
>   on supporting Android browsers). iOS Safari, Focus/DND, and many desktops
>   ignore it. This is **not** a native alarm and is not guaranteed.
> - Snooze and custom sound remain out of MVP scope.

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
| **Web Push (Phase D)** | Permission granted, service worker registered, device subscribed; delivery happens via the backend dispatch endpoint even when the NEXA page is closed | Best-effort via the browser push service; not delivered if push is disabled, in battery-saver, under OS restrictions, or when the server scheduler does not run; no guaranteed latency. |

**What the web app CANNOT do (and we will not claim it can):**

- Set or ring the phone's **native alarm clock**.
- Override **Do Not Disturb / Focus / quiet modes**.
- Guarantee delivery when the app/tab is closed (push is best-effort and
  requires the backend scheduler to run, browser/device permissions, and
  platform/network availability).
- Access SMS, the system calendar, or other apps' notifications.
- Reliably wake a sleeping device.

> A future **native mobile app** could use local notifications + OS alarms. That
> is a **future feature**, explicitly out of MVP scope (product.md §9).

## 4. Notification permissions

- The app requests `Notification.permission` only in response to an explicit
  user action (e.g., tapping "Enable reminders"), **never** on page load.
- For push (Phase D): after notification permission, the app registers the
  service worker (`/sw.js`), creates a Web Push subscription with the VAPID
  public key, and stores the subscription server-side (`push_subscriptions`,
  scoped to the user, RLS-protected). Multiple devices are supported (one row
  per endpoint); a device can be removed via the unsubscribe endpoint.
- The VAPID **private** key and contact subject live only in server env vars
  (`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`); the public key is shipped to the
  browser (public by design). Never commit private VAPID credentials.
- If permission is denied or revoked, the app falls back to **in-app only**
  reminders and clearly tells the user that reminders will only work while the
  app is open.
- The app re-checks permission status on focus and never assumes a grant lasts.

## 5. Scheduled reminders

- Reminders are derived from a task's `due_at` and the user's
  `default_lead_minutes` (e.g., remind 15 min before).
- **The backend owns scheduling (Phase D).** A dispatch endpoint
  (`/api/notifications/dispatch`) scans `reminder_schedules` for due, enabled,
  undelivered reminders and sends Web Push to the user's subscribed devices. It
  is triggered by a scheduler (Render Cron or an external pinger, e.g.
  UptimeRobot, every few minutes) — it does NOT depend on any browser being
  open.
- **While the app is open:** the client-side reminder engine still polls
  (~30 s, plus on focus) for instant in-app toasts + browser notifications.
- Dispatch honesty rules: `delivered` is set ONLY when a push actually
  succeeded to at least one device; disabled reminders, disabled settings,
  push-disabled channels, completed/skipped tasks, and quiet-hours windows are
  skipped; dead endpoints (HTTP 404/410) are removed; nothing else is
  modified. No reminder is falsely marked delivered.
- Timezone: `remind_at` is stored as the UTC instant the user intended
  (computed client-side in the user's local time). Quiet hours are applied by
  the server in UTC during dispatch; the in-app engine applies them in the
  browser's local time.

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

- Push subscription endpoints/keys are stored server-side
  (`push_subscriptions`), scoped to the user, RLS-protected, and used only to
  deliver that user's own reminders. The dispatch endpoint never exposes one
  user's subscriptions to another.
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
- Web Push (Phase D): best-effort, subscription-based, not guaranteed; requires
  HTTPS, service-worker + push support, granted permission, a stored
  subscription, and the backend scheduler running.
- No native alarms, no Do-Not-Disturb override, no SMS/calendar access, no
  reliable wake-from-sleep. Any feature depending on these is out of MVP scope.
