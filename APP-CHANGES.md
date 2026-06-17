# Bluprint app — changes needed for the admin dashboard

Handoff brief for the **bluprint-health app** (Expo / React Native, JS). An admin
dashboard was built that shares this app's Supabase backend (project
`ljbkedvfaomfpjmwxbfm`). The **backend is already deployed and live** — all tables,
RLS policies, RPCs, and 28 edge functions exist now. This doc lists the **app-side**
work so the dashboard's data actually flows to/from users.

Two buckets: **Part 1** = code already written on a branch (just merge + ship);
**Part 2** = new code to build. Most of Part 2 is just *adding call sites* — the
reader/writer libs already exist on the branch.

---

## Part 1 — Ship what's already written (branch `admin-integration`)
These are committed on the `admin-integration` branch in this repo, build-verified
(`npx expo export --platform web` → "Exported: dist"). Review the diff, merge to
`master`, and ship a new build. After shipping, items 1–4 round-trip immediately.

1. **Server entitlement → `effectivePremium`** — `src/lib/serverEntitlement.js` +
   `src/state/AppState.jsx`. App calls the `is_entitled_self()` RPC and ORs it into
   `effectivePremium`, so a **dashboard premium grant loads in the app**. (Backend:
   `admin_comps` table + `is_entitled` already deployed.)
2. **Server-driven free-tier limits** — `src/lib/serverConfig.js` + `AppState.jsx`.
   Reads `free_daily_limit` / `free_plate_limit` / `free_chat_photo_limit` from
   `feature_flags`, bundled constants as fallback (changeable with no code push).
3. **Expo push-token registration** — `src/lib/pushTokens.js` + `src/state/AuthState.jsx`.
   Registers on sign-in (no-op until an EAS projectId exists — see Part 2 H).
4. **In-app announcements banner** — `src/components/AnnouncementBanner.jsx` mounted in
   `App.js`. Renders live announcements (filtered by the user's segment), dismissible.
5. **Analytics/report writer libs** (ready, mostly need call sites) — `src/lib/analytics.js`,
   `src/lib/userReports.js`, `user_consents` migration, `setAnalyticsUser` wired in
   `AuthState.jsx`, and a `session_start` event in `App.js`.

---

## Part 2 — New app changes to build (each unlocks a dashboard feature)

### A. Compound CMS fetch + cache  ⟵ biggest one
Fetch compounds from the Supabase **`compounds`** table on launch; cache them; fall
back to the bundled `src/data/compounds.js` (so the app works offline / pre-fetch).
`src/data/store.js` must rebuild its indexes from the fetched array. Read via
`supabase.from('compounds').select('*')` (RLS already returns only visible rows; map
`row.data` + columns back to the compound shape). **Unlocks:** editing/adding/hiding
compounds from the dashboard **without an app release**. *(No lib exists yet — net new.)*

### B. Analytics event call sites
Call `track('<event>', props)` (from `src/lib/analytics.js`) at the key moments:
`onboarding_complete`, `compound_view`, `protocol_add`, `scan`, `coach_query`,
`subscribe`, and `feature_used` with `{feature:'wearable'|'scan'|'coach'|'protocol'}`.
**Unlocks:** onboarding funnel + drop-off, D1/D7/D30 retention, activation rate,
feature adoption, session metrics, activity heatmap, and exact DAU/WAU/MAU.

### C. Search + scan-miss logging
- `logSearch(query, resultsCount)` in the library/compound search.
- `logScanMiss(kind, value)` when a barcode/food/label scan returns nothing.
(Both from `src/lib/analytics.js`.) **Unlocks:** most-searched compounds, the
"searches that returned nothing" content-gap finder, scan-not-found rate, trending.

### D. Feedback + support-ticket UI
- A "send feedback" path → `submitFeedback(body, rating?)` (from `src/lib/userReports.js`).
- An "open a support ticket" screen → `supabase.from('tickets').insert({ subject, body })`
  (RLS insert-own; users can read their own tickets + non-internal messages, and reply).
**Unlocks:** the dashboard's feedback inbox + Support ticket threads.

### E. Adverse-event report UI
A "report a side effect" path → `submitAdverseEvent({ compoundId?, description, severity })`
(from `src/lib/userReports.js`). **Unlocks:** AI Safety → adverse-event reports (important
liability posture for a peptides app).

### F. Consent-acceptance recording
In `OnboardingFlow` (and anywhere consent is accepted), call
`recordConsentAcceptance('ai', <versionNumber>)` (and `'tos'`/`'privacy'` if used) from
`src/lib/userReports.js`. Optional: switch the displayed consent copy to the server
version via `fetchActiveConsent('ai')` (`src/lib/serverConfig.js`). **Unlocks:** the
consent-version manager's evidentiary trail (which version each user accepted, when).

### G. AI thumbs up/down (sentiment)
Add a 👍/👎 control on coach replies and record it as `sentiment` (-1/+1) on the query.
Needs coordination with the `coach` edge function (the AI-query log it writes has a
`sentiment` column). **Unlocks:** AI response sentiment in the dashboard.

### H. EAS projectId + Apple Push  ⟵ blocked on paid Apple Developer account
Set `expo.extra.eas.projectId` in `app.json` and configure the Apple Push key. Until
this exists, `registerPushToken()` no-ops, so push can't target anyone. **Unlocks:**
push notifications actually sending.

### I. Compound view counts (minor)
When a compound profile opens, increment its view count. NOTE: the
`bump_compound_view(id)` RPC is currently **service-role only** (so a client can't
inflate counts) — so this needs a tiny public edge function (e.g. `bump-compound-view`)
that the app calls, OR re-granting the RPC. Coordinate with backend. **Unlocks:**
per-compound view counts in the CMS.

### J. (Optional) True "last active" heartbeat
Stamp a `bp.lastActive` value (or call a lightweight endpoint) on app foreground, for a
real last-active timestamp instead of the current `max(user_state.updated_at)` approximation.

### K. (Optional) Paywall price override
Read the `paywall_price_override` flag from `feature_flags` for promo pricing periods.

### L. (Optional) Feature-flag targeted rollout
If you want %-based / specific-user rollouts, honor a flag value shaped like
`{ enabled, rolloutPct, allowUserIds[] }` (hash the user id against `rolloutPct`).

---

## Data contracts (all live on the backend NOW — safe to build against)
- **App reads** (anon/authenticated, RLS-scoped): `feature_flags`, `announcements`
  (live only), `compounds` (visible only), `consent_versions` (active).
- **App writes** (RLS insert-own, authenticated): `analytics_events`, `search_log`,
  `scan_misses`, `tickets` (+ `ticket_messages`), `adverse_events`, `feedback`,
  `user_consents`, `push_tokens`.
- **RPC** (authenticated): `is_entitled_self()` → bool (premium, incl. admin comps).
- The libs on the `admin-integration` branch already wrap all of these — prefer adding
  call sites over re-implementing.

## How to verify a change works (round-trip, no App Store needed)
Run a dev build pointed at the live Supabase, signed in as a test account:
- Grant that user premium in the dashboard → app's `is_entitled_self()` → premium flips.
- Create an announcement in the dashboard → app banner shows it.
- App fires an event → row in `analytics_events` → dashboard Overview DAU ticks up.
