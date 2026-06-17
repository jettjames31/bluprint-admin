# CHROME-PROMPTS — browser tasks (reality-checked)

Backend is **deployed** (16 migrations + 23 functions live on `ljbkedvfaomfpjmwxbfm`).
Dashboard `.env` is set (anon key already copied from the app). Founder seeding is
**waiting on the 3 emails**. Below: what's actually worth doing, what's done, what's blocked.

| Task | Status |
|---|---|
| Supabase anon key → dashboard `.env` | ✅ done (same as `EXPO_PUBLIC_SUPABASE_ANON_KEY`) |
| Email OTP `{{ .Token }}` + Google provider | ✅ done (6/16) |
| Add `http://localhost:1420` redirect URL | ✅ done (added 2026-06-17) |
| Resend invites key (`RESEND_API_KEY`) | ✅ set in Supabase secrets (2026-06-17) |
| **Verify `getbluprinthealth.com` DNS (DKIM/SPF/MX)** | ▶️ do now — prompt B2 (records "Not Started" at NS1) |
| RevenueCat REST key + project id + webhook | ✅ set (webhook pre-wired; data appears once IAP is live) |
| Expo/EAS push projectId | ⛔ blocked — needs the paid Apple Developer account; skip |
| Landing page → `lead-capture` | ⛔ skip — confirm a waitlist page exists first; uses `getbluprinthealth.com` |

> ⚠️ Sending domain is **`getbluprinthealth.com`** (NOT `bluprint.health`). Invite emails
> default to `onboarding@getbluprinthealth.com` (overridable via the `INVITE_FROM_EMAIL` secret).
> Secret prompts instruct the agent to NEVER display/type/screenshot a secret value — only confirm.

---

## A. ▶️ Add the dashboard dev origin to Supabase redirect URLs (do now, 30s)

```
Go to https://supabase.com/dashboard/project/ljbkedvfaomfpjmwxbfm/auth/url-configuration .
Under "Redirect URLs", add http://localhost:1420 (the admin dashboard's local dev origin, so
Google sign-in can return during development). Save. Confirm it's listed. Don't change anything
else on the page.
```

## B. ▶️ Resend — verify the real domain + create the invites key (do now)

```
Go to https://resend.com and sign in to the Bluprint account.
PART A — Domains: open getbluprinthealth.com (this is the real sending domain — do NOT touch
bluprint.health). Confirm its DNS records (DKIM/SPF/MX) are all Verified/green. If any are still
pending or missing, tell me exactly which records are unverified (do not change DNS yourself).
PART B — API Keys → Create API Key named "bluprint-admin-invites" with Sending access only.
PART C — store it in Supabase: open
https://supabase.com/dashboard/project/ljbkedvfaomfpjmwxbfm/settings/functions (Edge Functions →
Secrets) and add a secret named RESEND_API_KEY with the new key as its value. Paste the key
DIRECTLY into the Supabase field — never display, type, screenshot, or repeat the key value in
this chat. Only confirm "RESEND_API_KEY set" and report the getbluprinthealth.com verification
status. (Invites send from onboarding@getbluprinthealth.com.)
```

## B2. ▶️ Add the Resend DNS records at NS1 + verify (unblocks invite sending)

The `RESEND_API_KEY` is set, but `getbluprinthealth.com` shows "Not Started" — the DKIM/SPF/MX
records aren't at the DNS provider yet, so no mail can send until they're added + verified.

```
Two tabs:
TAB 1 — Resend: https://resend.com → Domains → getbluprinthealth.com. This page lists the exact
DNS records to add (each has a Type, a Name/Host, and a Value). Read them precisely; the DKIM
value is long.
TAB 2 — NS1 (the DNS provider): open the getbluprinthealth.com zone. Add EACH record exactly as
Resend specifies, and change NOTHING else in the zone:
  • TXT  resend._domainkey   = <the long DKIM value from Resend>
  • MX   send                = feedback-smtp.us-east-1.amazonses.com   (priority 10)
  • TXT  send                = v=spf1 include:amazonses.com ~all
  • TXT  _dmarc              = v=DMARC1; p=none;   (optional)
Match Resend's Name/Host format to NS1's (relative host vs FQDN) so each record resolves to the
right name. Do NOT modify or delete any existing records, and do NOT touch bluprint.health.
TAB 1 again — click "Verify DNS Records" in Resend. DNS can take a few minutes to propagate; if
it's still pending, wait ~5–10 min and click verify again. Report the final per-record status
(Verified / Pending). Do not display any secret values.
```

## C. ⏳ RevenueCat — store the REST key + project id (optional; zeros until IAP is live)

Status: PROJECT ID = `proj20ef4dae`. The v2 REST key "bluprint-admin-dashboard" (read-only on
metrics + customers) is created. The **webhook is ALREADY wired** — an existing "Supabase
entitlements" webhook points at the function and `REVENUECAT_WEBHOOK_SECRET` is already set in
Supabase (since 6/16). DO NOT create a second webhook or overwrite the existing one's auth.
Only the two non-webhook values remain to store:

```
Go to https://supabase.com/dashboard/project/ljbkedvfaomfpjmwxbfm/settings/functions (Edge
Functions → Secrets). Add two secrets:
  • REVENUECAT_API_KEY     = <the RevenueCat v2 "bluprint-admin-dashboard" secret key>
  • REVENUECAT_PROJECT_ID  = proj20ef4dae        (not secret)
Get the key value from RevenueCat (app.revenuecat.com → Project settings → API keys → the
"bluprint-admin-dashboard" key → "Show key"). Paste it DIRECTLY into the Supabase field — never
display, type, screenshot, or repeat the key value in this chat. Only confirm "REVENUECAT_API_KEY
and REVENUECAT_PROJECT_ID set". Do NOT touch the existing "Supabase entitlements" webhook.
(Revenue metrics stay zero until real in-app purchases are live — this just wires the key.)
```

---

## Done / blocked — no action

- **Anon key → dashboard `.env`** — ✅ already set (same value as `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
- **Email OTP `{{ .Token }}` + Google provider** — ✅ configured 6/16 (only the localhost redirect in prompt A is new).
- **Expo/EAS push** — ⛔ blocked on the paid Apple Developer account (push can't work before then). Revisit after that's sorted: add the EAS `projectId` to `app.json` (`expo.extra.eas.projectId`) and configure the Apple Push key, then push-token registration goes live.
- **Landing page → `lead-capture`** — ⛔ skip until you confirm a waitlist page exists and where it lives. The function IS deployed; when ready, point the form at
  `https://ljbkedvfaomfpjmwxbfm.supabase.co/functions/v1/lead-capture` with the public anon key
  (body `{email,name,source:"landing",type:"waitlist"}`), in the `getbluprinthealth.com` site.
