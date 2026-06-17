# DECISIONS — Bluprint Admin Dashboard

Every assumption made during the autonomous overnight build (2026-06-16 → 06-17),
and why. Where a decision needs your input in the morning, it's cross-referenced to
[MORNING-TODO.md](./MORNING-TODO.md) / [CHROME-PROMPTS.md](./CHROME-PROMPTS.md).

---

## Stack & architecture
- **Tauri v2 + React 18 + TypeScript + Vite** (decision was pre-made). React 18 (not 19)
  for ecosystem stability with react-router/react-query/recharts.
- **HashRouter** (not BrowserRouter): the bundled `.app` serves from a `file://`/custom-
  protocol origin with no routing server, so hash routes avoid deep-link 404s. Supabase
  PKCE returns `?code=` in the query string, which stays readable alongside the hash route.
- **@tanstack/react-query** for all server state (caching, refetch, mutations). **recharts**
  for the revenue chart. **No component library** — a small hand-rolled design system
  (`src/theme/global.css` + `src/components/ui.tsx`) keeps the bundle lean and the look
  consistent (dense dark dashboard, monochrome + one accent, in keeping with Bluprint's
  restrained brand; the gradient is reserved for the consumer app's premium surfaces).
- **All bluprint-health work is on the `admin-integration` branch** (migrations, edge
  functions, AND app changes). The hard constraint was "do not modify master," so even the
  additive backend lives on the branch, ready to merge in the morning. Master is untouched.

## Security model (non-negotiable — implemented as specified)
- The dashboard ships **only the public anon key** (same key the app ships). It never holds
  the service-role key.
- Every privileged operation goes through an **`admin-*` Edge Function** that runs
  `requireAdmin()` first: POST-only + credential + durable rate-limit (via the existing
  `gate()`), resolve the real user JWT, then check the `admins` allowlist via the
  `is_admin()` RPC (service role) — **fails CLOSED** on any misconfig. Only then does it use
  the service role. Mirrors `_shared/guard.ts` and the `delete-account` pattern.
- No secret value is ever printed, returned, or committed. `.env` is gitignored; only
  `.env.example` (public URL + a blank anon slot) is committed.

## Admin auth & the `admins` allowlist
- Founder sign-in: **email OTP** (`shouldCreateUser:false` — the dashboard doesn't create
  accounts) + **Google OAuth**. After sign-in, `admin-flags{whoami}` confirms allowlist
  membership; a signed-in non-founder gets a clean "access denied" screen.
- **Seeding:** the `admins.user_id` FK references `auth.users`, so placeholder UUIDs that
  don't exist yet would break the migration. The seed INSERT is therefore left **commented**
  in `…_admins.sql`, and a `add_admin_by_email(email)` bootstrap RPC is provided so you can
  add the 3 founders by email after deploy. **→ MORNING-TODO step "Seed admins" — nothing in
  the dashboard works until at least one founder is added.**

## RevenueCat (revenue metrics + plan/trial status)
- `admin-revenue` is built fully against the **RevenueCat REST API v2** overview metrics,
  but reads `REVENUECAT_API_KEY` + `REVENUECAT_PROJECT_ID` from env. When the key is absent
  it returns `{configured:false, …null, note}` (a 200, not an error) and the Revenue page
  renders a "connect RevenueCat" state. The exact v2 metric ids are mapped defensively
  (every field defaults to null) since the key wasn't available to test against tonight.
  **→ CHROME-PROMPTS #1 (create the key) + MORNING-TODO (set the secret).**
- Subscription **plan/trial** enrichment on the Users page also comes from RevenueCat;
  until the key is set, Users shows premium/free from the `entitlements` mirror only
  (trial vs monthly/annual is blank).

## AI query content logging (PRIVACY — OFF by default)
- The `ai_queries` table + the `admin-ai-queries` read path + the `ai_query_logging` feature
  flag (**default `false`**) are all built. The `coach` Edge Function has a **gated,
  best-effort logging branch** that writes a row ONLY when the flag is true (the flag is read
  with a short per-isolate cache so it adds no latency while off).
- **Privacy note:** when enabled this stores users' **health questions and the AI's
  answers** — sensitive data. Before flipping it on, review retention + consent (and consider
  truncation / a cleanup job). It ships dormant; the dashboard's "Query content log" panel
  shows an explicit "logging is OFF" state until you enable it. **Do not enable without a
  consent/retention decision.**

## "Last active"
- Approximated as **`max(user_state.updated_at)`** per user (updates on sync writes, not true
  presence) — shipped in V1 as agreed. A true heartbeat (stamp on app foreground) is the
  optional upgrade; not built.

## Leads / waitlist
- The landing-page signup source is unknown, so a **public `lead-capture` Edge Function** is
  built (IP rate-limited, validates email, service-role upsert, de-duped on `(lower(email),
  type)`). **The landing page still needs to POST to it** — see MORNING-TODO / CHROME-PROMPTS.
- **Bulk invite** (`admin-invite-leads`) emails via **Resend** (already the app's SMTP
  provider) using `RESEND_API_KEY`. Without the key it returns a clear note and does NOT flip
  status (so "invited" never lies). From-address `onboarding@bluprint.health` — the domain
  must be verified in Resend. **→ CHROME-PROMPTS #2.**

## Push notifications
- `admin-send-push` sends via the **Expo Push API** in batches of 100, resolving segments
  (free/premium from `entitlements`; **trial is best-effort/empty** — trial state lives in
  RevenueCat). The app change to **register Expo push tokens** is shipped on
  `admin-integration` (`src/lib/pushTokens.js`), but it **no-ops until an EAS `projectId` is
  configured** (`app.json` `extra.eas.projectId` is currently empty; `expo-constants`/
  `expo-device` aren't installed, so the token call infers the projectId and gracefully skips
  if it can't). **→ MORNING-TODO: set the EAS projectId for push to function.**

## App changes (on `admin-integration`, verified with `expo export --platform web`)
- **Server entitlement → `effectivePremium`** (the required "grant premium loads in the app"
  change): `AppState.jsx` ORs in a server entitlement read via `serverEntitlement.js`, enabled
  by a new `entitlements_select_own` RLS policy (read own row only; writes stay service-role).
  **Done + verified.**
- **Server-driven free-tier limits**: `AppState.jsx` reads `free_daily_limit` /
  `free_plate_limit` / `free_chat_photo_limit` from `feature_flags`, falling back to the
  bundled constants — so the limits can change without a code push, and it's a no-op until a
  value is set. **Done + verified.**
- **Push token registration**: wired into `AuthState.jsx` on sign-in. **Done** (no-op until
  EAS projectId set).
- **In-app announcements** are fully wired: a global dismissible top banner
  (`AnnouncementBanner.jsx`) is mounted in `App.js` alongside the existing
  StreakSheet/TourOverlay overlays; it reads live announcements, filters by the user's
  segment, and persists dismissals. **Done + verified** (expo export).
- **Consent reader** (`fetchActiveConsent`) lib is shipped, but switching `OnboardingFlow`
  to server-managed consent copy touches the onboarding flow and was left as a documented
  follow-up (the bundled consent copy still drives onboarding). See PROGRESS.md.

## Compound CMS
- Backend (`compounds` table + `admin-compounds` CRUD) + the dashboard CMS page (list / edit /
  add / show-hide / delete, with the research-status badge editor) are **built**. The table
  starts **empty**, so the dashboard shows a "using bundled fallback" notice until seeded; a
  one-time seed from `src/data/compounds.js` is a separate task (see
  [scripts/seed-compounds.md](./scripts/seed-compounds.md)). The **app-side fetch+cache with
  bundled fallback** (the V3 app data-layer change) is **not** wired — documented as remaining.

## Misc
- **error_log**: table + `admin-health` read + a `logError()` helper in `adminGuard.ts` are
  built; individual functions write to it best-effort (opt-in), so the panel starts sparse and
  fills as failures occur.
- **Support tickets**: full V2 backend + dashboard inbox + RLS letting the app open/read its
  own tickets are built. The **in-app "open a ticket" UI** is not built (a V2 app change).
- **Tauri icons**: a placeholder brand-mark icon is generated (`scripts/gen-icon.cjs` →
  `tauri icon`). Replace with real artwork anytime; not blocking.
