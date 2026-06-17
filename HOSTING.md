# Hosting & updates

The admin dashboard is hosted as a web app — the simplest way to keep 3 founders on
the latest version.

- **Live URL:** https://jettjames31.github.io/bluprint-admin/
- **Repo:** https://github.com/jettjames31/bluprint-admin (public — see note below)
- **Hosting:** GitHub Pages, auto-deployed by `.github/workflows/deploy.yml`.

## Rolling out an update (frontend)
```
edit code → git commit → git push origin main
```
GitHub Actions rebuilds and redeploys to the URL in ~1 minute. **Founders just refresh
the page** — no reinstall, no re-signing, no redistribution. (Manual trigger anytime:
`gh workflow run deploy.yml`.)

## Backend updates (edge functions / migrations)
Still via the Supabase CLI (project `ljbkedvfaomfpjmwxbfm`):
```
supabase db push
supabase functions deploy <name>            # admin-* / new functions
supabase functions deploy revenuecat-webhook --no-verify-jwt   # + lead-capture
```
(Optional future: a GitHub Action that runs these on push, using a SUPABASE_ACCESS_TOKEN
repo secret.)

## Build config (GitHub repo settings)
- Repo **variable** `VITE_SUPABASE_URL` = the project URL.
- Repo **secret** `VITE_SUPABASE_ANON_KEY` = the public anon key (it ships in the client
  bundle by design; kept out of source).

## Founder sign-in on the hosted URL
- **Email code works out of the box.** Each founder enters their email → 6-digit code →
  verifies (creates their account) → I seed them in `admins` → they tap "Re-check access".
- **Google sign-in** needs the Pages origin added to Supabase Auth → Redirect URLs
  (add `https://jettjames31.github.io/bluprint-admin/`). Email login doesn't need this.

## Why the repo is public
Free GitHub tier can't serve Pages from a private repo. Public is safe here: there are
NO committed secrets (`.env` is gitignored; the anon key is injected at build and is
public anyway), and all access is gated server-side by Supabase auth + the `admins`
allowlist — reading the code grants no access. To make the URL itself private later,
move hosting to Cloudflare Pages / Vercel / Netlify (free tier, private repo + access
control) — the build is identical.
