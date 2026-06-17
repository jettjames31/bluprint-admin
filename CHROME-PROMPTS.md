# CHROME-PROMPTS — browser-only setup tasks

Ready-to-paste prompts for Claude-in-Chrome (or do them yourself). Each is
self-contained. **Every prompt instructs the browser agent to NEVER read, echo,
screenshot, copy, or otherwise reveal any secret value — only confirm completion.**
You paste the actual secret into the terminal yourself (see
[MORNING-TODO.md](./MORNING-TODO.md) step 4).

The Supabase project ref is `ljbkedvfaomfpjmwxbfm`.

---

## 1. RevenueCat — create a secret API key + get the project id

```
Go to https://app.revenuecat.com and sign in to the Bluprint account. I need to set
up programmatic access to revenue metrics for an internal admin dashboard.

1. Open the project for the Bluprint iOS app. In the URL or Project settings, find
   the PROJECT ID (it looks like "proj1a2b3c…" or a UUID). Tell me ONLY the project
   id — that is not a secret and I need it for configuration.
2. Go to Project settings → API keys (the new "v2" / REST API keys section, not the
   legacy SDK keys). Create a new SECRET API key named "bluprint-admin-dashboard"
   with READ access to metrics/overview and subscribers (read-only is enough).
3. CRITICAL: do NOT display, read aloud, type into chat, screenshot, or copy the
   secret key value anywhere. After creating it, the page shows the value once — I
   will copy it directly from that screen into my terminal myself. Just confirm
   "the key is created and visible on screen for you to copy," and tell me the key's
   name and that it has read access. Never reveal the key characters.
```
Then: `supabase secrets set REVENUECAT_API_KEY=…` and `REVENUECAT_PROJECT_ID=…`.

---

## 2. Resend — create a send API key + verify the sending domain

```
Go to https://resend.com and sign in to the Bluprint account. I need an API key so an
internal admin function can send early-access invite emails.

1. Go to API Keys → Create API Key. Name it "bluprint-admin-invites" with "Sending
   access" permission (it only needs to send). 
2. Go to Domains and confirm that "bluprint.health" is verified (DNS records green).
   If it is NOT verified, tell me which DNS records are missing — but do NOT change
   any DNS yourself. We send invites from onboarding@bluprint.health, so the domain
   must be verified.
3. CRITICAL: do NOT display, read aloud, type into chat, screenshot, or copy the API
   key value. The page reveals it once on creation — I will copy it from that screen
   into my terminal myself. Just confirm the key was created with sending access, and
   report the domain verification status. Never reveal the key characters.
```
Then: `supabase secrets set RESEND_API_KEY=…`.

---

## 3. Expo / EAS — get the projectId for push notifications (optional)

```
Go to https://expo.dev and sign in to the Bluprint account. I need the EAS projectId
for the Bluprint Health app so push notifications can be sent.

1. Open the Bluprint Health project. In Project settings / overview, find the
   "Project ID" (a UUID). The projectId is NOT a secret — tell it to me.
2. Confirm the project has push notifications / an Apple Push key configured (just
   tell me yes/no; do not reveal any key or credential contents).
3. Do NOT reveal any access token, API key, or credential value.
```
Then add it to `bluprint-health/app.json` as `expo.extra.eas.projectId` and rebuild.

---

## 4. Supabase — copy the PUBLIC anon key for the dashboard .env (not a secret)

```
Go to https://supabase.com/dashboard/project/ljbkedvfaomfpjmwxbfm/settings/api .
I need the project's PUBLIC anon/publishable key for a client app's config — this key
is designed to be shipped in clients, so it is safe to share with me.

Tell me the value of the "anon" / "publishable" key (the one labeled public). Do NOT
reveal the "service_role" key — that one IS a secret; never display or copy it.
```
Then paste it into `bluprint-admin/.env` as `VITE_SUPABASE_ANON_KEY`. (It's the same
value as the app's `EXPO_PUBLIC_SUPABASE_ANON_KEY`, so you may already have it.)

---

## 5. Supabase — verify Google OAuth + email OTP for founder sign-in

```
Go to https://supabase.com/dashboard/project/ljbkedvfaomfpjmwxbfm/auth/providers .
This is for an internal admin dashboard whose founders sign in with email codes or
Google.

1. Confirm the Email provider is enabled and that "Confirm email" / OTP works. The
   email template must include the {{ .Token }} variable so a 6-digit code is sent
   (the dashboard verifies a code, not a magic link).
2. Under URL Configuration → Redirect URLs, add the dashboard's dev origin
   http://localhost:1420 so Google OAuth can redirect back during local dev.
3. Confirm the Google provider is enabled.
4. Do NOT reveal any provider client secret or key value — only confirm the settings
   and report what (if anything) is missing.
```

---

## 6. (If wiring the landing page) — point the waitlist form at lead-capture

```
The Bluprint landing/marketing page needs its waitlist signup form to POST new leads
to our backend. Add a submit handler that sends:

  POST https://ljbkedvfaomfpjmwxbfm.supabase.co/functions/v1/lead-capture
  Headers: { "apikey": "<PUBLIC anon key>", "content-type": "application/json" }
  Body:    { "email": "<entered email>", "name": "<entered name or empty>",
             "source": "landing", "type": "waitlist" }

On a 200 with {"ok":true}, show a "you're on the list" confirmation. The anon key is
the public publishable key (safe in a client). Do NOT use or request the service_role
key anywhere. For an Instagram-tester form, send "type":"tester" and optionally
"instagram_handle".
```
```
