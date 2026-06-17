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
- **Email + password.** Accounts are pre-created in Supabase (no self-signup, no email
  delivery involved). Create each founder under Authentication → Users → **Add user** with
  **Auto Confirm User** checked, set a password, then seed them in `admins`. The founder
  signs in with that email + password — works on both the hosted URL and the desktop app
  (no browser redirect needed).
- To create accounts: Supabase dashboard → Authentication → Users → Add user → enter email +
  password, tick **Auto Confirm User**. Then run the founder seed (`add_admin_by_email`).

## Why the repo is public
Free GitHub tier can't serve Pages from a private repo. Public is safe here: there are
NO committed secrets (`.env` is gitignored; the anon key is injected at build and is
public anyway), and all access is gated server-side by Supabase auth + the `admins`
allowlist — reading the code grants no access. To make the URL itself private later,
move hosting to Cloudflare Pages / Vercel / Netlify (free tier, private repo + access
control) — the build is identical.
