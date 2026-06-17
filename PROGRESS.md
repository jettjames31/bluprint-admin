# PROGRESS — Bluprint Admin Dashboard

Final state of the autonomous overnight build (2026-06-16 → 06-17). What's built +
verified, what's stubbed/gated, what's left. See [DECISIONS.md](./DECISIONS.md) for the
why and [MORNING-TODO.md](./MORNING-TODO.md) for deploy steps.

## Verification status (all green)
- **Dashboard:** `npm run build` (tsc --noEmit + vite build) — ✅ clean.
- **Tauri shell:** `cargo check` (src-tauri) — ✅ clean. Icons generated. `tauri:build`
  not run overnight (slow + must stay unsigned per constraints) but is ready.
- **Edge functions:** all 14 + modified `coach` pass `npx esbuild … --log-level=error` — ✅.
- **App changes:** `npx expo export --platform web` → "Exported: dist" — ✅.
- **Contract review:** all 14 functions adversarially verified against the dashboard
  API client — response shapes match; 2 minor issues found + fixed (see git log).
- **Nothing deployed.** All bluprint-health work is on the `admin-integration` branch.

## Where the code lives
- **Dashboard app:** `/Users/jettarch/Projects/bluprint-admin` (own git repo).
- **Migrations + edge functions + app changes:** `/Users/jettarch/Projects/bluprint-health`
  on the **`admin-integration`** branch (master untouched).

---

## BUILT + VERIFIED

### Dashboard (Tauri + React + TS)
- Foundation: Vite/TS/Tauri v2 configs, design system, founder auth (email OTP +
  Google + `admins` allowlist check via `whoami`), sidebar shell, routing, toasts/modals.
- **Users** — list, search, CSV export, profile detail, **grant/revoke premium**
  (duration + audit reason), **delete account**. (V1)
- **Revenue** — RevenueCat metrics tiles + revenue chart; graceful "connect RevenueCat"
  state until the key is set. (V1, key-gated)
- **AI Monitoring** — today/week/month counts + top users + high-usage (50+/hr) flags
  from `rate_limits`; query content log panel (shows "logging OFF" until enabled). (V1)
- **App Health** — Supabase status + latency, RevenueCat webhook freshness, active users
  (24h/7d), error count, recent error log; auto-refresh. (V1)
- **Leads** — waitlist/tester tabs, inline status, notes, add lead, CSV export, bulk
  invite. (V2)
- **Announcements** — create/edit/delete with segment + live window. (V2)
- **Push** — compose to all/segment/specific user + send history. (V2)
- **Settings** — admin-user management, feature-flags & free-tier-limit editor (with a
  guarded privacy toggle for AI logging), consent-version publisher. (V2/V3)
- **Compounds** — full CMS: list, edit fields, add, show/hide, delete, research-status
  badge editor; "using bundled fallback" notice until seeded. (V3)
- **Support** — ticket inbox with status filter + open-count, detail thread, reply
  (+ internal notes), status/priority. (V2)

### Backend — Supabase migrations (11 new, `admin-integration`)
`admins` (+ `is_admin`, `add_admin_by_email`), entitlements audit cols +
`entitlements_select_own` policy, `leads`, `announcements`, `push_tokens`+`push_log`,
`feature_flags` (seeded with current defaults) + `consent_versions`, `ai_queries`
(privacy-gated), `error_log`, `tickets`+`ticket_messages`, `compounds`. RLS on every
table; app-readable config tables have scoped SELECT policies, everything privileged is
service-role only.

### Backend — Edge functions (14 new + coach edit)
`admin-users`, `admin-grant-premium`, `admin-delete-user`, `admin-leads`, public
`lead-capture`, `admin-invite-leads` (Resend), `admin-send-push` (Expo Push),
`admin-announcements`, `admin-compounds`, `admin-flags` (flags+consent+admins+whoami),
`admin-revenue` (RevenueCat REST), `admin-health`, `admin-ai-queries`, `admin-tickets`.
Shared `_shared/adminGuard.ts` gates all `admin-*` on the founder allowlist. `coach`
gained a dormant, flag-gated `ai_queries` logging branch.

### App changes (`admin-integration`, verified via expo export)
- **`effectivePremium` honors a server entitlement** (RevenueCat webhook OR dashboard
  grant) — the required "grant premium loads in the app" change. (`serverEntitlement.js`
  + `entitlements_select_own` policy + `AppState.jsx`.)
- **Server-driven free-tier limits** from `feature_flags` with bundled fallback
  (`serverConfig.js` + `AppState.jsx`).
- **Expo push-token registration** on sign-in (`pushTokens.js` + `AuthState.jsx`).
- **In-app announcements banner** — a global dismissible top banner
  (`AnnouncementBanner.jsx`, mounted in `App.js`) that reads + renders live
  announcements from the dashboard, filtered by the user's segment.
- **Consent reader lib** (`serverConfig.fetchActiveConsent`).

---

## STUBBED / GATED (intentional)
- **RevenueCat** integration is complete but returns `configured:false` until
  `REVENUECAT_API_KEY` + `REVENUECAT_PROJECT_ID` are set (CHROME-PROMPTS #1).
- **Bulk invite** needs `RESEND_API_KEY` (CHROME-PROMPTS #2); without it, it returns a
  "key not set" note and does not mark leads invited.
- **AI query content logging** ships OFF (`ai_query_logging=false`). Table + read path +
  coach logging branch all exist but dormant. Requires a retention/consent decision.
- **Push** no-ops until an EAS `projectId` is configured (MORNING-TODO #7).
- **`compounds` table empty** → CMS shows the bundled-fallback notice until seeded
  (`scripts/seed-compounds.md`).
- **`admins` empty** → seed the 3 founders before first use (MORNING-TODO #3).

## REMAINING (not built — scoped follow-ups)
- **Server-consent in onboarding** — `fetchActiveConsent` ships, but `OnboardingFlow`
  still uses the bundled consent copy; switch it to the server version when ready.
- **Compound CMS app fetch** — the app doesn't yet fetch+cache the `compounds` table with
  the bundled array as fallback (V3 app data-layer change). CMS edits won't reach users
  until this + a release.
- **In-app "open a ticket" UI** — the tickets backend + RLS support it; the app screen to
  create a ticket isn't built (V2 app change).
- **True "last active"** — currently approximated by `max(user_state.updated_at)`; an app
  foreground heartbeat is the optional upgrade.
- **error_log coverage** — `logError()` helper exists; wire more functions to write on
  failure for a fuller App Health panel.
- **Tauri build + notarization** — run `tauri:build` in the morning; signing/notarization
  deliberately deferred.
