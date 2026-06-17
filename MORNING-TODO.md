# MORNING TODO — Bluprint Admin Dashboard

Ordered checklist of everything I couldn't do overnight (deploys, secrets, the 3
real founder UUIDs, external keys). Do them in order — later steps depend on earlier
ones. Commands assume the Supabase CLI is linked to project `ljbkedvfaomfpjmwxbfm`.

Browser-only sub-tasks (creating API keys, dashboard config) have ready-to-paste
prompts in [CHROME-PROMPTS.md](./CHROME-PROMPTS.md). The rationale for every choice
is in [DECISIONS.md](./DECISIONS.md). Current state is in [PROGRESS.md](./PROGRESS.md).

> ⚠️ Nothing was deployed overnight, by design. All bluprint-health work is on the
> **`admin-integration`** branch (master untouched).

---

## 0. Review the branch (5 min)
```bash
cd /Users/jettarch/Projects/bluprint-health
git checkout admin-integration
git log --oneline master..admin-integration      # the 5 commits added
git diff master..admin-integration --stat
```
Why: see exactly what will deploy/merge before you push anything.

## 1. Deploy the migrations  ▸ creates all new tables/policies/RPCs
```bash
cd /Users/jettarch/Projects/bluprint-health
supabase db push        # applies migrations 20260617000001 … 000011 (11 new)
```
Adds: `admins` (+ `is_admin`, `add_admin_by_email` RPCs), entitlements audit cols +
`entitlements_select_own` policy, `leads`, `announcements`, `push_tokens`+`push_log`,
`feature_flags`(seeded)+`consent_versions`, `ai_queries`, `error_log`,
`tickets`+`ticket_messages`, `compounds`.
Why: every function + the app changes read/write these.

## 2. Deploy the Edge Functions  ▸ the dashboard's backend
```bash
cd /Users/jettarch/Projects/bluprint-health
for fn in admin-users admin-grant-premium admin-delete-user admin-leads \
          lead-capture admin-invite-leads admin-send-push admin-announcements \
          admin-compounds admin-flags admin-revenue admin-health \
          admin-ai-queries admin-tickets; do
  supabase functions deploy "$fn"
done
# also redeploy coach (gained the dormant, flag-gated ai_queries logging branch):
supabase functions deploy coach
```
Notes: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are injected
into functions automatically — you do NOT set those. `lead-capture` is the only PUBLIC
function (no admin gate); all `admin-*` gate on the `admins` allowlist.

## 3. ⭐ Seed the 3 founders into `admins`  ▸ NOTHING works until this is done
Each founder must have signed into the Bluprint app at least once (so their
`auth.users` row exists). Then, in the Supabase SQL editor (or `psql`):
```sql
select public.add_admin_by_email('founder1@example.com');
select public.add_admin_by_email('founder2@example.com');
select public.add_admin_by_email('founder3@example.com');
select user_id, email, role from public.admins;   -- confirm 3 rows
```
(If a founder has no account yet, have them sign into the dashboard once — it will
say "access denied", which still creates… no: dashboard sign-in uses
`shouldCreateUser:false`. So they must have a Bluprint **app** account first, or add
them by uuid: `select id,email from auth.users where email = '…';` then
`insert into public.admins (user_id,email,role) values ('<uuid>','<email>','founder');`)
Why: the allowlist is the single gate for all admin access.

## 4. Set the external secrets  ▸ unlocks revenue + invite emails
Get the keys via [CHROME-PROMPTS.md](./CHROME-PROMPTS.md) #1 (RevenueCat) and #2
(Resend), then paste them into the terminal yourself (never echoed by the browser):
```bash
cd /Users/jettarch/Projects/bluprint-health
supabase secrets set REVENUECAT_API_KEY=...        # v2 secret key (CHROME #1)
supabase secrets set REVENUECAT_PROJECT_ID=...      # RevenueCat project id (CHROME #1)
supabase secrets set RESEND_API_KEY=...             # Resend send key (CHROME #2)
# redeploy the two functions that read them so they pick up the new secrets:
supabase functions deploy admin-revenue
supabase functions deploy admin-invite-leads
```
Until set: the Revenue page shows a "connect RevenueCat" state, and bulk-invite
returns a "key not set" note (it does NOT mark leads invited). Everything else works.

## 5. Configure + run the dashboard  ▸ the Mac app
```bash
cd /Users/jettarch/Projects/bluprint-admin
cp .env.example .env
#   VITE_SUPABASE_URL is pre-filled; paste the PUBLIC anon key into
#   VITE_SUPABASE_ANON_KEY (same EXPO_PUBLIC_SUPABASE_ANON_KEY the app uses;
#   it's public, safe to put here). See CHROME-PROMPTS #4 if you need to copy it.
npm install            # (already run overnight, but safe to re-run)
npm run tauri:dev      # live dev window, OR:
npm run tauri:build    # builds Bluprint Admin.app + a .dmg in src-tauri/target/release/bundle
```
Sign in with a founder email (you'll get a 6-digit code) or Google.
Note: `npm run build` (frontend) and `cargo check` (Rust shell) both passed overnight,
and the icons are generated, so `tauri:build` should succeed. It is **unsigned** — do
NOT notarize/sign tonight per the constraints; that's a later step if you distribute it.

## 6. Wire the landing-page waitlist  ▸ so signups actually arrive
Point the landing page's signup form at the public capture function:
```
POST https://ljbkedvfaomfpjmwxbfm.supabase.co/functions/v1/lead-capture
Headers: apikey: <PUBLIC anon key>, content-type: application/json
Body: {"email":"...", "name":"...", "source":"landing", "type":"waitlist"}
```
For Instagram testers, POST `type:"tester"` (+ optional `instagram_handle`).
See CHROME-PROMPTS #5 if the landing page is the GitHub-Pages legal/marketing site.

## 7. Enable push (optional, when ready)  ▸ set the EAS projectId
Push-token registration ships in the app but no-ops until an EAS `projectId` exists.
In `bluprint-health/app.json`, add `expo.extra.eas.projectId` (from `eas project:info`
or the EAS dashboard — CHROME-PROMPTS #3), then rebuild the app. Then dashboard → Push works.

## 8. Merge to master + ship the app changes (when satisfied)
```bash
cd /Users/jettarch/Projects/bluprint-health
git checkout master && git merge admin-integration
```
The app changes (`effectivePremium` honoring server entitlement, server-driven free
limits, push-token registration) only reach users after a **new app build** is shipped.
Until then, dashboard premium grants take effect server-side but won't change a user's
in-app UI. (Verified: `npx expo export --platform web` → "Exported: dist".)

## 9. Optional / later
- `compounds` table is empty → the CMS shows "using bundled fallback". Seed it once
  from the bundled data: see [scripts/seed-compounds.md](./scripts/seed-compounds.md).
  The app-side fetch+cache (so edits ship without a release) is still a V3 app change.
- Schedule the rate-limit cleanup with pg_cron (see the rate_limits migration comment).
- AI query logging stays OFF. Only flip `ai_query_logging` after a retention/consent
  decision (Settings → Feature flags has a guarded toggle). See DECISIONS.md.
- In-app announcements **banner** + server-consent reader UI are not wired into the
  app screens yet (the read libs exist) — see PROGRESS.md "Remaining".
```
