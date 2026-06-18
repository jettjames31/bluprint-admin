# Multi-app control plane

The dashboard is **federated**: each app keeps its own backend (its own Supabase
project + RevenueCat). The dashboard is a control plane that switches between
them. A game and a health app never share a schema — each just implements the
same `admin-*` function contract so the per-app pages and the Portfolio rollup
work uniformly.

## How it fits together
- **Registry** — `src/lib/apps.ts` lists every app (`AppDef`: id, name, monogram,
  color, Supabase URL + anon key, functions URL, `live`).
- **Active app** — module-level state (so the non-React API client reads it) +
  `src/lib/activeApp.tsx` for React reactivity. Switching clears the query cache
  so every page refetches against the new app.
- **API client** — `callApp(app, fn, body)` targets a specific app; `call(fn)`
  targets the active one. Existing pages (Users/Revenue/Analytics/AI/…) are
  unchanged — they just follow the active app.
- **Switcher** — top of the sidebar. **Portfolio** (`/portfolio`) shows all apps'
  headline KPIs + combined totals; click an app to make it active and drill in.

## The common metrics contract
For an app to light up the per-app pages + the portfolio, its backend must expose
the `admin-*` functions the dashboard calls — at minimum `admin-overview`
returning `{ users, premium, dau, newSubsWeek, ... }` (see
`bluprint-health/supabase/functions/admin-overview`). App-specific analytics
(e.g. a game's level/retention) are extra pages on top.

## Adding an app (checklist)
1. **Stand up its backend** — a Supabase project for the app (or reuse one).
2. **Deploy the admin function suite** to that project (copy
   `supabase/functions/admin-*` + `_shared`, adapt to the app's tables), and push
   the migrations it needs (`admins`, `admin_audit_log`, the metric tables).
3. **Seed the founders** into that project's `admins` table (same flow as
   Bluprint: create the auth accounts + `add_admin_by_email(..., 'owner')`). Each
   project has its own auth, so founders need an account per app.
4. **Register it** — add an `AppDef` to `APPS` in `src/lib/apps.ts` with the
   project's URL + anon key + a monogram/color, `live: true`.
5. Commit + push → it appears in the switcher and Portfolio automatically.

## Auth note (cross-project)
Founder sign-in happens against the **home app** (Bluprint) today. Because each
app's Supabase project has its own auth, a fully federated setup means the
dashboard holds a session per project. For now the home session drives calls;
when the second app's backend is live, wire its session (a per-app sign-in or a
shared SSO) — the registry + switcher + API layer are already in place for it.
