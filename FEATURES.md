# FEATURES — coverage map

Every feature from the founder's lists, mapped to status. The goal of this doc is
"nothing gets lost": each item is either built, scaffolded ready-to-activate, or
flagged with exactly what it needs.

**Legend**
- ✅ **Built** — works against the backend now (UI + edge function + table).
- 🟡 **Ready to activate** — table + edge function + dashboard UI exist; needs app
  instrumentation to start producing data (the writer libs ship on the
  `admin-integration` branch), or a flag flip. No code change to turn on — just data.
- 🔌 **Needs external integration** — requires an external account/key or SDK
  (Sentry, OneSignal/APNs, App Store Connect, Twilio, attribution). Documented, not built.
- 📱 **Needs app UI** — backend is ready; the in-app screen that drives it isn't built.

Security note: the dashboard never holds the service-role key; every privileged
action is gated by `requireAdmin` (role-tiered) and recorded in `admin_audit_log`.

---

## USERS
| Feature | Status | Notes |
|---|---|---|
| Full user list + search/filter | ✅ | Users page (`admin-users`) |
| Profile view (name/email/signup/goal/experience/health flags/physician) | ✅ | from `auth.users` + `bp.profile.v1` |
| Subscription status (free/trial/monthly/annual) | ✅ / 🔌 | free/premium now; trial/monthly/annual labels need RevenueCat key (`admin-revenue`) |
| Trial start/end | 🔌 | from RevenueCat (key) |
| Last active date | ✅ | approx via `max(user_state.updated_at)` |
| Account health score | 🟡 | composite needs login/AI/protocol events → `analytics_events` (instrument) |
| User journey (chronological actions) | 🟡 | `analytics_events` per-user timeline (instrument) |
| Override subscription tier | ✅ | via grant (comp) — `admin-grant-premium` |
| Extend trial | ✅ | grant comp with expiry — `admin-grant-premium` |
| Internal notes per user | ✅ | `admin-notes` + Users detail |
| Flag account (suspicious/refund/support) | ✅ | `admin-notes` flags |
| Delete account | ✅ | `admin-delete-user` (owner-only, audited) |
| Impersonate / view-as (read-only, audited) | ✅ | `admin-export` state inspector (audited) |

## SUBSCRIPTIONS & REVENUE
| Feature | Status | Notes |
|---|---|---|
| MRR / ARR live | 🔌 | RevenueCat key (`admin-revenue`) |
| MRR movement (new/expansion/contraction/churn/net) | 🟡 | from `subscription_events` (webhook now logs them) |
| Free vs trial vs monthly vs annual breakdown | 🔌 | RevenueCat |
| Churn (monthly + rolling 90d) | 🔌 | RevenueCat |
| LTV / ARPU | 🔌 | RevenueCat |
| New subs today/week/month | ✅ / 🟡 | from `subscription_events` |
| Trial→paid conversion | 🔌 | RevenueCat |
| Revenue chart (daily/weekly/monthly) | 🔌 | RevenueCat (chart UI built) |
| Projected MRR 30d | 🔌 | derive from RevenueCat trajectory |
| Refund log | ✅ | Subscriptions page (`admin-subscriptions`, from `subscription_events`) |
| At-risk (trials ending 48h, billing retry) | ✅ | Subscriptions page |
| Comped-users list (who/why/expiry/granted-by) | ✅ | Subscriptions page (`admin_comps`) |
| Subscription event feed | 🟡 | `subscription_events` (populates as webhook fires) |

## WAITLIST & LEADS
| Feature | Status | Notes |
|---|---|---|
| Waitlist signups + name/email/date | ✅ | Leads page; public `lead-capture` for the landing page |
| Source tag | ✅ | |
| Status (waitlist/invited/converted/dead) | ✅ | |
| Notes per lead | ✅ | |
| Export CSV | ✅ | |
| Bulk invite | ✅ | `admin-invite-leads` (Resend key) |
| Conversion rate / time-to-convert | 🟡 | needs lead→subscribe linkage (instrument) |

## INSTAGRAM TESTER LEADS
| Feature | Status | Notes |
|---|---|---|
| Tester view + IG handle | ✅ | Leads page, `type='tester'` |
| Status (applied/accepted/active/dropped) | ✅ | |
| Tester feedback notes | ✅ | notes field |
| Quick approve → invite | ✅ | |
| Tester completion rate | 🟡 | needs onboarding events |
| Bug reports per tester | 🟡 | `feedback` table (app UI to submit) |

## ANALYTICS & GROWTH
| Feature | Status | Notes |
|---|---|---|
| DAU/WAU/MAU + DAU/MAU ratio | ✅ / 🟡 | Analytics + Overview; exact via `analytics_events`, approx via `user_state` now |
| New users today/week/month | ✅ | |
| Activation rate / onboarding funnel + drop-off | 🟡 | `analytics_events` funnel (instrument onboarding steps) |
| D1/D7/D30 retention | 🟡 | `analytics_events` cohorts |
| Feature adoption (AI/scheduling/Apple Health) | 🟡 | `analytics_events` |
| Session length / sessions per week | 🟡 | `analytics_events` |
| Most searched compounds | 🟡 | `search_log` (instrument search) |
| Most bookmarked compounds | ✅ | computed from synced `bp.bookmarks.v1` |
| Most-asked AI questions (aggregated) | 🟡 | needs AI logging ON (privacy) |
| Goal / experience / gender distribution | ✅ | from `bp.profile.v1` (real data) |
| Geographic breakdown | 🔌 | needs geo capture (IP/locale) — not collected |
| Device / iOS version breakdown | 🟡 | `analytics_events.platform/app_version` |
| Push open rates | 🔌 | OneSignal/APNs delivery callbacks |

## COMPOUND LIBRARY CMS
| Feature | Status | Notes |
|---|---|---|
| Full compound list | ✅ | Compounds page |
| Edit any field | ✅ | `admin-compounds` |
| Add new compound (no release) | ✅ / 📱 | dashboard CRUD done; app fetch+cache w/ bundled fallback = app change |
| Toggle visible/hidden | ✅ | |
| Research-status badge editor | ✅ | |
| Cross-category tag manager | ✅ | edited via the data blob |
| "Researched alongside" editor | ✅ | |
| Version history + rollback | ✅ | `compound_versions` (`admin-compounds` versions/restore) |
| View count / bookmark count / AI mention count | 🟡 / ✅ | bookmarks ✅ (synced); views/AI mentions via `compound_stats` (instrument) |
| Flag for legal review | 🟡 | use a `user_flags`-style flag or status (extend) |
| Schedule go-live | 🟡 | add a `publish_at` column + app respects it |
| Real-world stack graph | ✅ | computed from synced `bp.protocol.items.v1` co-occurrence (Analytics) |
| Trending compounds | 🟡 | `search_log` velocity (instrument search) |
| Off-library AI mentions | 🟡 | needs coach to tag mentions (AI logging) |
| "Last medically reviewed" date | 🟡 | add column + reminder (extend) |

## AI MONITORING
| Feature | Status | Notes |
|---|---|---|
| Total queries today/week/month | ✅ | AI Monitoring (from `rate_limits`) |
| Queries per user (sortable) | ✅ | |
| Free-tier usage / who hits the limit | ✅ | |
| High-usage alerts (50+/hr) | ✅ | |
| Full query log (input/output/model/ts) | 🟡 | `ai_queries` — privacy-gated, OFF by default |
| Query failure log | ✅ | `error_log` (App Health) |
| Average response time | 🟡 | `ai_queries.latency_ms` (logging ON) |
| Common query topics (clustered) | 🟡 | needs logging + clustering |
| Guardrail / dosing-request hotspots | 🟡 | Safety page; needs coach to tag flagged queries |
| Sentiment (thumbs up/down) | 🟡 / 📱 | `ai_queries.sentiment` + app thumbs UI |
| Token usage + API cost tracker | 🟡 | Cost page (`admin-cost`) — populates when AI logging ON |
| Cost per query / projected 30d | 🟡 | Cost page |

## CONTENT & NOTIFICATIONS
| Feature | Status | Notes |
|---|---|---|
| Push to all / segment / user | ✅ / 🔌 | `admin-send-push` (Expo); needs EAS projectId + tokens |
| Schedule push for future | 🟡 | add a `scheduled_push` table + a cron drain (extend) |
| Notification history + delivery rate | ✅ / 🔌 | history ✅ (`push_log`); delivery rate needs receipts |
| In-app banner manager | ✅ | Announcements page (app banner shipped) |
| Email broadcast (Resend) | 🟡 | reuse `admin-invite-leads` Resend path for segments (extend) |
| New-compound announcement workflow | ✅ | Announcements + Compounds |

## FEATURE FLAGS
| Feature | Status | Notes |
|---|---|---|
| Toggle any feature (no code push) | ✅ | Settings → flags |
| Targeted rollout (% / A/B) | 🟡 / 📱 | flag value supports `{enabled,rolloutPct,allowUserIds}`; app honors it |
| Enable for specific user IDs | 🟡 / 📱 | same flag shape |
| Free-tier limit live | ✅ | `free_daily_limit` flag (app reads it) |
| Paywall price override | 🟡 / 📱 | `paywall_price_override` flag (app reads it) |
| Coming-soon visibility | 🟡 / 📱 | flag (app reads it) |
| **Kill switches** (coach/scanners) | ✅ | enforced server-side in the AI functions |

## APP HEALTH & MONITORING
| Feature | Status | Notes |
|---|---|---|
| Live error feed | ✅ / 🔌 | `error_log` (App Health); full Sentry = external |
| API status (Anthropic/Supabase/RevenueCat/...) | ✅ / 🔌 | Supabase + RC-webhook freshness ✅; others = external pings |
| Failed AI queries w/ detail | ✅ | `error_log` |
| Supabase slow-query alerts | 🔌 | Supabase logs/observability |
| Uptime tracker | 🔌 | external monitor |
| Crash rate by version | 🔌 | Sentry |
| Alert rules (email/Slack) | 🔌 | needs a notifier integration |

## SUPPORT (V2)
| Feature | Status | Notes |
|---|---|---|
| All tickets / detail / status tags | ✅ | Support page (`admin-tickets`) |
| Agent notes + internal thread | ✅ | |
| Reply from dashboard | ✅ | |
| Ticket history per user | ✅ | |
| Priority + escalation flag | ✅ | |
| Canned responses | ✅ | `canned_responses` (`admin-growth`/`admin-tickets`) |
| Ticket tags | ✅ | `tickets.tags` |
| Avg first-response / resolution time | ✅ | `first_response_at`/`resolved_at` tracked |
| CSAT | 🟡 / 📱 | `tickets.csat` column; needs in-app rating |
| Open-count badge | ✅ | (openCount returned; nav badge optional) |
| In-app "open a ticket" / feedback inbox | 📱 / 🟡 | `feedback` table + `submitFeedback` ready; needs app UI |

## TEAM & SETTINGS
| Feature | Status | Notes |
|---|---|---|
| Admin user management | ✅ | Settings |
| Permission tiers (owner/admin/support/readonly) | ✅ | enforced in every function |
| **Audit log** (who/what/when/why) | ✅ | Audit page (`admin_audit_log`) |
| Consent version manager + archive | ✅ | Settings (`consent_versions`) |
| Consent-acceptance tracking | 🟡 / 📱 | `user_consents` + `recordConsentAcceptance` ready; wire in onboarding |
| Data export (compliance) | ✅ | `admin-export` (audited) |
| Account-deletion log (GDPR) | ✅ | via audit log (`delete_user`) |
| API key management / rotation | 🟡 | rotate via `supabase secrets set` (documented); no in-dash key store by design (security) |
| Webhook log (RevenueCat/Apple) | 🟡 | `subscription_events` is the RC feed; raw webhook log = extend |

## GROWTH TOOLS (V2)
| Feature | Status | Notes |
|---|---|---|
| Referral program manager | ✅ | Growth page (`referral_codes`) |
| Discount code generator | ✅ | Growth page (`discount_codes`) |
| Cohort analysis | 🟡 | `analytics_events` cohorts |
| A/B test manager | 🟡 / 📱 | feature-flag rollout shape |
| Influencer/creator tracker | ✅ / 🟡 | referral codes by owner_label; conversion needs linkage |
| App Store review monitor | 🔌 | App Store Connect API |
| Saved smart segments | ✅ | Growth page (`saved_segments`) |

## NICHE / V4 (founder backlog)
Real-world stack graph ✅ · trending compounds 🟡 · off-library AI mentions 🟡 ·
dosing-request hotspots 🟡 · last-medically-reviewed 🟡 · onboarding demographics ✅ ·
health-flag × high-risk watch list ✅ · first-AI-question log 🟡 · silent-onboarder
detector 🟡 · power-user/streak leaderboard 🟡 (streak synced) · activity heatmap 🟡 ·
wearable freshness coverage 🟡 (wearable_connections) · demo-leak canary 🔌 · scan
not-found rate 🟡 · push effectiveness 🔌 · compound-of-the-week ✅ (announcements+CMS) ·
coach-context inspector ✅ (`admin-export` state) · raw bp.* browser ✅ (`admin-export` state) ·
RevenueCat webhook replay 🟡 (re-POST to the webhook).

---

## What "ready to activate" needs (the short list)
1. **App instrumentation** (ship the `admin-integration` branch + a release): call
   `track()` at key events, `logSearch()` in search, `submitFeedback()` /
   `submitAdverseEvent()` from app UI, `recordConsentAcceptance()` in onboarding, AI
   thumbs → `sentiment`. Then funnels/retention/adoption/search-gaps/feedback light up.
2. **AI logging ON** (privacy decision): flip `ai_query_logging` → the full query log,
   cost tracking, and safety queue populate. See DECISIONS.md.
3. **External keys**: RevenueCat (revenue), Resend (invites/email), EAS projectId (push).
4. **External integrations (future)**: Sentry (crashes/errors), OneSignal/APNs (push
   delivery + open rates), App Store Connect (reviews), an attribution SDK (UTM/geo).
