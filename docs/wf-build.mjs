export const meta = {
  name: 'bluprint-admin-build',
  description: 'Generate the admin dashboard edge functions + feature pages against fixed contracts',
  phases: [
    { title: 'Edge functions' },
    { title: 'Dashboard pages' },
  ],
}

const HEALTH = '/Users/jettarch/Projects/bluprint-health'
const ADMIN = '/Users/jettarch/Projects/bluprint-admin'

const RESULT = {
  type: 'object',
  additionalProperties: false,
  required: ['file', 'status', 'summary'],
  properties: {
    file: { type: 'string', description: 'absolute path written' },
    status: { type: 'string', enum: ['done', 'partial', 'failed'] },
    verified: { type: 'boolean', description: 'true if the verification command passed (exit 0)' },
    summary: { type: 'string' },
    followups: { type: 'string', description: 'anything left undone or assumptions made' },
  },
}

// ============================================================
// EDGE FUNCTIONS
// ============================================================
const FN_PREAMBLE = `You are writing ONE Supabase Edge Function (Deno, TypeScript) for the Bluprint
admin dashboard backend. The repo is at ${HEALTH}. Work ONLY in that repo.

READ THESE FIRST (they define the exact patterns you must mirror):
- ${HEALTH}/supabase/functions/_shared/adminGuard.ts   (requireAdmin, serviceClient, readBody, logError)
- ${HEALTH}/supabase/functions/_shared/anthropic.ts    (cors, json)
- ${HEALTH}/supabase/functions/_shared/guard.ts         (gate, verifyUser — used by adminGuard)
- ${HEALTH}/supabase/functions/delete-account/index.ts  (reference: service-role + storage purge + auth.admin.deleteUser)
- The relevant migration(s) in ${HEALTH}/supabase/migrations/ for the table(s) you touch (file names below).

ARCHITECTURE & SECURITY (non-negotiable):
- The dashboard calls this function with a founder's JWT. EVERY admin function must gate with
  requireAdmin() FIRST, then do privileged work with the service role via serviceClient().
- NEVER read/echo/return any secret. Secrets (service role, RevenueCat key, Resend key) are read
  from Deno.env only and used server-side.
- Mirror the existing import style EXACTLY. Use esm.sh for supabase-js (serviceClient already does).
  Do NOT add npm imports that need bundling.

STANDARD ADMIN SKELETON (adapt the routing to the actions in your spec):
\`\`\`ts
import { cors, json } from '../_shared/anthropic.ts'
import { requireAdmin, serviceClient, readBody } from '../_shared/adminGuard.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const g = await requireAdmin(req, { name: '<FUNCTION_NAME>' })
  if (g instanceof Response) return g
  const { userId } = g  // the founder's uid — use for audit columns (created_by/granted_by/updated_by)
  const body = await readBody<Record<string, unknown>>(req)
  let admin
  try { admin = serviceClient() } catch { return json({ error: 'Service role not configured on the server.' }, 503) }
  try {
    const action = (body.action as string) || '<default>'
    // ... route on action, query/write tables via admin.from('...'), return json({...})
    return json({ error: 'Unknown action.' }, 400)
  } catch (e) {
    console.error('[<FUNCTION_NAME>]', e)
    return json({ error: 'Request failed.' }, 500)
  }
})
\`\`\`

CONTRACT FIDELITY: the dashboard's API client (${ADMIN}/src/lib/api.ts) already pins the exact
request bodies and response JSON shapes. Your function MUST match the shapes in your spec exactly
(key names, nesting). The response types live in ${ADMIN}/src/types/index.ts — read it to match field names.

VERIFY before returning: run
  cd ${HEALTH} && npx esbuild supabase/functions/<NAME>/index.ts --log-level=error >/dev/null && echo OK
(esbuild WITHOUT --bundle only transpiles, so remote/.ts imports are fine; exit 0 = pass.)
Set verified:true only if it printed OK. Write the file at supabase/functions/<NAME>/index.ts.
Return ONLY the structured result.`

const FUNCTIONS = [
  {
    name: 'admin-users',
    spec: `Migrations: 20260612000000_user_state.sql, 20260616000001_entitlements.sql, 20260617000002_entitlements_audit.sql,
20260614000000_rate_limits.sql, 20260616000000_rate_limits_sliding_cleanup.sql.

Actions:
1) {action:'list', search?, limit?, offset?} -> {users: AdminUser[], total: number}
2) {action:'get', userId} -> {user: AdminUser}
3) {action:'aiUsage'} -> AiUsageSummary {today, week, month, byUser:[{user_id,count,email?}], highUsage:[{user_id,count,email?}]}

AdminUser shape (match ${ADMIN}/src/types/index.ts exactly):
{ id, email, phone, provider, createdAt, lastSignInAt, lastActiveAt, profile|null, entitlement|null, plan?, trialStart?:null, trialEnd?:null }
- Get auth users via admin.auth.admin.listUsers({ page, perPage: 1000 }) — PAGINATE until fewer than perPage returned (cap ~5000 for safety; note if capped).
- provider = user.app_metadata?.provider; createdAt = user.created_at; lastSignInAt = user.last_sign_in_at; phone = user.phone||null.
- profile: fetch all rows from user_state where key='bp.profile.v1' (select user_id,value,updated_at) and map value JSON onto each user.
- entitlement: fetch all rows from entitlements; attach the matching row (or null).
- lastActiveAt: approximate as the MAX(updated_at) across ALL the user's user_state rows. Efficient approach:
  select user_id,updated_at from user_state (all rows), reduce to max per user in JS. (Founder tool; fine.)
- plan: if entitlement?.active -> 'premium' else 'free' (RevenueCat trial/monthly/annual enrichment is admin-revenue's job; leave trialStart/trialEnd null).
- 'list' applies search (case-insensitive over email + profile.name) server-side if provided, supports limit/offset slicing; total = full matched count BEFORE slicing.
- 'get' returns the single merged user for userId (404 json error if not found).

aiUsage (counts only, NO content): read public.rate_limits rows where bucket like 'coach:%'.
- Bucket format is 'coach:u:{uuid}' (signed-in) or 'coach:ip:{ip}' (anon). count column is per (bucket, window_start) fixed window.
- today = sum(count) for window_start >= (now - 24h). week/month: rate_limits is cleaned to ~1 day so older windows are gone — set week and month to the same 24h-floor value and put a note in followups that true week/month totals need the ai_queries table or a dedicated counter (cleanup_rate_limits drops >1 day).
- byUser: for 'coach:u:{uuid}' buckets, sum count per uuid over retained windows, sort desc, take top 50; attach email by matching listUsers (best-effort). Group 'coach:ip:*' as a single {user_id:'anonymous', count}.
- highUsage: users whose summed count over the LAST 60 MINUTES (window_start >= now-60min) is >= 50. Same email enrichment.`,
  },
  {
    name: 'admin-grant-premium',
    spec: `Migration: 20260616000001_entitlements.sql + 20260617000002_entitlements_audit.sql.
No 'action' field. Two modes on the SAME function:
- Grant: {userId, expiresAt?:string|null, reason?:string} -> {granted:true}
  Upsert into entitlements (on_conflict user_id): entitlement='premium', active=true, expires_at=expiresAt??null,
  source='admin_grant', granted_by=<founder userId>, reason=reason??null, updated_at=now.
- Revoke: {userId, revoke:true} -> {revoked:true}
  Upsert/update entitlements for userId: active=false, source='admin_grant', granted_by=<founder userId>, updated_at=now.
Validate userId is a uuid; 400 otherwise. Use admin.from('entitlements').upsert(..., {onConflict:'user_id'}).
The entitlements FK is to auth.users — if the upsert fails on a missing user, return a clear 400.`,
  },
  {
    name: 'admin-delete-user',
    spec: `Reference delete-account/index.ts. Body {userId} -> {deleted:true}.
Same purge as delete-account but for the ADMIN-SPECIFIED userId (not the caller):
1) remove all objects in 'user-photos' bucket under \`{userId}\` and \`{userId}/progress\`,
2) delete wearable_connections where user_id=userId,
3) admin.auth.admin.deleteUser(userId) (CASCADEs user_state/entitlements/etc).
Validate userId is a uuid (400 if not). max:20. Guard: a founder must not be able to delete themselves by accident? Allow it but it's their call.`,
  },
  {
    name: 'admin-leads',
    spec: `Migration: 20260617000003_leads.sql. Table public.leads. Lead type in ${ADMIN}/src/types/index.ts.
Actions:
- {action:'list', type?, status?} -> {leads: Lead[]} (filter by type/status when given; order created_at desc)
- {action:'create', lead:{name?,email,source?,status?,notes?,instagram_handle?,type?}} -> {lead}
  (default type 'waitlist', default status 'waitlist'; validate email present)
- {action:'update', id, patch:Partial<Lead>} -> {lead}  (whitelist updatable cols: name,email,source,status,notes,instagram_handle,type,invited_at,converted_at)
- {action:'delete', id} -> {deleted:true}
Return the full row(s) from supabase (.select() after insert/update).`,
  },
  {
    name: 'lead-capture',
    public: true,
    spec: `PUBLIC function (NO admin gate) — the landing page POSTs here to create a waitlist/tester lead.
DO NOT use requireAdmin. Use the cheap-endpoint gate pattern from coach/index.ts instead:
\`\`\`ts
import { cors, json } from '../_shared/anthropic.ts'
import { gate } from '../_shared/guard.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const blocked = await gate(req, { name: 'lead-capture', max: 10 })  // IP-keyed rate limit, no user required
  if (blocked) return blocked
  // parse body, validate email, service-role upsert
})
\`\`\`
Body: {name?, email, source?, type?, instagram_handle?}. type in ('waitlist','tester') default 'waitlist'.
Validate email with a simple regex; 400 if invalid. Build a service-role client from Deno.env SUPABASE_URL +
SUPABASE_SERVICE_ROLE_KEY (503 if missing). Upsert into leads on conflict (email,type) — note the unique index is
on (lower(email), type), so do an insert and on a duplicate-key error treat as success (ok:true) rather than failing,
OR select-then-insert. status default 'waitlist' for waitlist, 'applied' for tester. source default 'landing'.
Respond {ok:true}. CORS must allow the public web origin (cors from anthropic.ts already sets '*'). Never return secrets.`,
  },
  {
    name: 'admin-invite-leads',
    spec: `Migration: 20260617000003_leads.sql. Body {ids:string[]} -> {invited:number, failed:number, note?:string}. max:30.
Sends an early-access email to each selected lead via Resend, then flips status->'invited', invited_at=now.
- Read RESEND_API_KEY from Deno.env. If MISSING: do NOT flip status; return {invited:0, failed:ids.length, note:'RESEND_API_KEY not set — see CHROME-PROMPTS.md'} with 200.
- For each id: load the lead (email,name,type), POST https://api.resend.com/emails with Authorization: Bearer <key>,
  from 'Bluprint <onboarding@bluprint.health>' (note in followups that the domain must be verified in Resend),
  subject 'You're in — early access to Bluprint', a short friendly HTML body. On 2xx -> flip status+invited_at, invited++. else failed++.
- Catch per-lead errors so one bad address doesn't abort the batch. Return counts.`,
  },
  {
    name: 'admin-send-push',
    spec: `Migration: 20260617000005_push.sql (push_tokens, push_log) + entitlements for segments.
Actions:
- default (no action): {title, body, segment:'all'|'free'|'trial'|'premium', userId?} -> {sent, ok, errors}
- {action:'history'} -> {log: PushLogEntry[]} (push_log ordered created_at desc, limit 100)
Send via Expo Push API https://exp.host/--/api/v2/push/send (POST JSON array of messages, batch <=100).
Resolve target tokens:
- if userId given: tokens for that user only.
- else by segment: 'all' -> all tokens. 'premium' -> tokens for users with an active, unexpired entitlement
  (join entitlements where active and (expires_at is null or expires_at>now)). 'free' -> tokens for users withOUT
  an active entitlement. 'trial' -> best-effort: treat as empty set with a note in followups (trial state lives in
  RevenueCat, not resolvable here yet).
Each Expo message: {to: token, title, body, sound:'default'}. Count ok/errors from the Expo response 'data' tickets
(status==='ok'). Insert a push_log row {title,body,segment,target_user_id:userId??null,sent_count,ok_count,error_count,created_by:userId? no — created_by = founder uid}. Validate title+body non-empty (400).`,
  },
  {
    name: 'admin-announcements',
    spec: `Migration: 20260617000004_announcements.sql. Announcement type in types/index.ts.
Actions:
- {action:'list'} -> {announcements: Announcement[]} (order created_at desc)
- {action:'create', announcement:{title,body,segment?,active?,starts_at?,ends_at?}} -> {announcement}
  (default segment 'all', active true; set created_by=<founder uid>; validate title+body)
- {action:'update', id, patch} -> {announcement} (whitelist title,body,segment,active,starts_at,ends_at)
- {action:'delete', id} -> {deleted:true}
Return full rows via .select().`,
  },
  {
    name: 'admin-compounds',
    spec: `Migration: 20260617000010_compounds.sql. Compound type in types/index.ts.
The table stores a few editable columns + a jsonb 'data' blob holding the full compound object.
Actions:
- {action:'list'} -> {compounds: Compound[], source:'server'|'empty'}
  Read all rows ordered by sort nulls last, then name. Map each row to a Compound: spread row.data first, then overlay
  the column values (id, name, primaryCategory<-primary_category, researchStatusBadge<-research_status_badge,
  oneLiner<-one_liner, legalStatus<-legal_status, hidden, updated_at), and set source:'server'. If zero rows, source:'empty'.
- {action:'upsert', compound:Compound} -> {compound}
  Map Compound -> row: id, name, primary_category, research_status_badge, one_liner, legal_status, hidden??false,
  updated_by=<founder uid>, and data = the full compound object MINUS the columned scalar fields (keep arrays like
  aka/benefits/sideEffects/categories/researchedAlongside + residues/nonPeptide/researchStatusFull/wada/whatItIs/howItWorks in data).
  Upsert on conflict id. Return the mapped Compound back.
- {action:'toggle', id, hidden:boolean} -> {compound}
- {action:'delete', id} -> {deleted:true}`,
  },
  {
    name: 'admin-flags',
    spec: `Migrations: 20260617000006_config.sql (feature_flags, consent_versions), 20260617000001_admins.sql (admins, add_admin_by_email RPC).
This is the config multiplexer. Actions:
- {action:'whoami'} -> {isAdmin:true, role:string|null, email:string|null}
   (requireAdmin already passed, so the caller IS an admin; look up role from admins where user_id=<founder uid>;
    email from admin.auth.admin.getUserById(userId). Non-admins never reach here — they get 403 from requireAdmin,
    which the dashboard interprets as isAdmin:false. So just return isAdmin:true here.)
- {action:'list'} -> {flags: FeatureFlag[]} (feature_flags ordered by key)
- {action:'set', key, value, description?} -> {flag}  (upsert feature_flags; value is jsonb — store as-is; set updated_by)
- {action:'delete', key} -> {deleted:true}
- {action:'consentList'} -> {versions: ConsentVersion[]} (consent_versions ordered kind, version desc)
- {action:'consentPublish', kind, body} -> {version}
   (compute next version = max(version) for that kind + 1 (start at 1); set all existing rows of that kind active=false;
    insert new row active=true, created_by=<founder uid>; return it)
- {action:'adminsList'} -> {admins: AdminRecord[]} (admins ordered added_at)
- {action:'adminsAdd', email, role?} -> {admin: AdminRecord}
   (call the add_admin_by_email RPC: admin.rpc('add_admin_by_email', {p_email: email, p_role: role||'founder'});
    return the row. If the RPC errors with 'No auth user' -> 400 with that message — the founder must sign in once first.)
- {action:'adminsRemove', userId} -> {deleted:true} (delete from admins where user_id=userId)
Match FeatureFlag/ConsentVersion/AdminRecord shapes in types/index.ts.`,
  },
  {
    name: 'admin-revenue',
    spec: `RevenueCat REST API integration. Action {action:'metrics'} -> RevenueMetrics (see types/index.ts).
Read REVENUECAT_API_KEY (secret) and REVENUECAT_PROJECT_ID from Deno.env.
- If REVENUECAT_API_KEY is MISSING: return {configured:false, totalSubscribers:null, activeSubscribers:null, trials:null,
  mrr:null, arr:null, freeCount:null, paidCount:null, churnRate:null, newThisWeek:null, newThisMonth:null,
  revenueSeries:[], note:'RevenueCat API key not set — see CHROME-PROMPTS.md'}. (200, NOT an error.)
- If present: call the RevenueCat REST API v2 overview metrics endpoint
  GET https://api.revenuecat.com/v2/projects/{REVENUECAT_PROJECT_ID}/metrics/overview
  with Authorization: Bearer <key>. Map the returned metric objects (they come as an array of {id,value,...} where ids
  include things like 'active_subscriptions','active_trials','mrr','revenue','new_customers') onto RevenueMetrics fields
  defensively (the exact shape may vary — guard every access, default to null). Set configured:true.
  Leave revenueSeries [] if no time series is available and note it in followups.
- NEVER log or return the key. On any upstream error, return configured:true with nulls + a note (don't 500 the dashboard).
Build it fully and correctly per the documented v2 shape, but degrade gracefully since the key is absent tonight.`,
  },
  {
    name: 'admin-health',
    spec: `Migrations: error_log (20260617000008), user_state, entitlements. Action default 'status'.
- {} or {action:'status'} -> AppHealth {supabase:{ok,latencyMs}, revenuecatWebhook:{lastEventAt,ok}, activeUsers:{last24h,last7d}, errors24h, checkedAt}
  - supabase: time a trivial query (e.g. select count from feature_flags limit 1) with Date.now() before/after; ok=no error, latencyMs=elapsed.
  - revenuecatWebhook: lastEventAt = max(updated_at) from entitlements where source is null or source='revenuecat'
    (proxy for last webhook write — note this in followups); ok = lastEventAt within last 30 days (or null->ok:false).
  - activeUsers.last24h / last7d = count of DISTINCT user_id in user_state with updated_at >= now-24h / now-7d
    (use head:true count queries with a gte filter; distinct may need an rpc — approximate by counting distinct in JS
     from a select of user_id where updated_at>=cutoff, or note the approximation).
  - errors24h = count of error_log rows in last 24h.
  - checkedAt = now ISO.
- {action:'errors', limit?} -> {errors: ErrorLogEntry[]} (error_log ordered created_at desc, limit default 100)`,
  },
  {
    name: 'admin-ai-queries',
    spec: `Migration: 20260617000007_ai_queries.sql + feature_flags. Body {limit?, userId?} -> {queries: AiQuery[], enabled:boolean}.
PRIVACY-GATED: first read the feature_flags row key='ai_query_logging'. enabled = (value === true).
- If NOT enabled: return {queries:[], enabled:false} immediately (do not read the table).
- If enabled: select from ai_queries (filter user_id when given), order created_at desc, limit default 200. Return {queries, enabled:true}.
Match AiQuery shape in types/index.ts.`,
  },
  {
    name: 'admin-tickets',
    spec: `Migration: 20260617000009_tickets.sql. Ticket/TicketMessage types in types/index.ts.
Actions:
- {action:'list', status?} -> {tickets: Ticket[], openCount:number}
   tickets ordered by (priority urgent first), updated_at desc; filter by status when given.
   Enrich each ticket: email (admin.auth.admin.getUserById — but that's N calls; instead collect distinct user_ids and
   look them up, or skip email and set null with a note) and messageCount (count of ticket_messages per ticket).
   openCount = count of tickets with status in ('open','in_progress').
- {action:'get', id} -> {ticket: Ticket, messages: TicketMessage[]}  (ALL messages incl. internal, ordered created_at asc)
- {action:'reply', id, body, internal?} -> {message: TicketMessage}
   insert ticket_messages {ticket_id:id, author:'admin', author_id:<founder uid>, body, internal:!!internal}; bump tickets.updated_at; return the message.
- {action:'status', id, status} -> {ticket} (validate status in open|in_progress|resolved|closed)
- {action:'priority', id, priority} -> {ticket} (validate priority in normal|urgent)`,
  },
]

// ============================================================
// DASHBOARD PAGES
// ============================================================
const PAGE_PREAMBLE = `You are writing ONE React + TypeScript page component for the Bluprint admin dashboard
at ${ADMIN}. Work ONLY in that repo.

READ THESE FIRST (the contracts + the style you must match):
- ${ADMIN}/src/pages/Users.tsx        (REFERENCE page — match this structure, hooks, and style closely)
- ${ADMIN}/src/lib/api.ts             (the typed API client — call ONLY the methods documented in your spec)
- ${ADMIN}/src/types/index.ts         (the data types you render)
- ${ADMIN}/src/components/Layout.tsx  (Page, PageHeader)
- ${ADMIN}/src/components/ui.tsx      (Loading, EmptyState, ErrorBanner, Modal, ConfirmModal, useToast)
- ${ADMIN}/src/lib/format.ts          (fmtDate, fmtDateTime, fmtRelative, fmtMoney, fmtNum, fmtPct, initials, downloadCsv)
- ${ADMIN}/src/theme/global.css       (the design-system classes you must use)

RULES:
- Export a NAMED component exactly as in the spec (e.g. \`export function Revenue() {...}\`). App.tsx imports it by that name.
- Use @tanstack/react-query (useQuery/useMutation/useQueryClient) for all data — same pattern as Users.tsx.
- Surface loading (<Loading/>), errors (<ErrorBanner message=... onRetry=.../>), and empty (<EmptyState>) states.
- Show a useToast() toast on mutation success/error. Invalidate the relevant query key after a mutation.
- Use ONLY the existing design-system CSS classes — DO NOT add new dependencies. Available classes include:
  card, card-title, stat/stat-label/stat-value/stat-sub, btn/btn-primary/btn-danger/btn-ghost/btn-sm,
  input/textarea/select/label/field, table/mono/row-click, badge/badge-{gray,green,amber,red,blue,purple},
  dot/dot-{green,red,amber}, grid/grid-2/grid-3/grid-4, row/between/gap-8/gap-12/gap-16/wrap/grow,
  muted/faint/right/nowrap/tabnum, modal-overlay/modal/modal-lg, empty.
  Wrap the page in <Page><PageHeader title=... subtitle=... actions={...}/> ... </Page>.
- recharts IS installed — use it ONLY where the spec asks for a chart (import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts').
- TypeScript strict mode + noUnusedLocals are ON: no unused imports/vars, type everything, no \`any\` (use the provided types).
- Keep it self-contained in one file at the path in your spec. Match the visual density + tone of Users.tsx.

You cannot typecheck one page alone (the whole app builds together later) — instead, re-read your imports against
api.ts/types/index.ts and make sure every call + field name matches EXACTLY. Set verified:false (the orchestrator runs
the full build). Write the file and return the structured result.`

const PAGES = [
  {
    name: 'Revenue',
    file: `${ADMIN}/src/pages/Revenue.tsx`,
    spec: `File: src/pages/Revenue.tsx. export function Revenue().
Calls revenueApi.metrics() -> RevenueMetrics.
- If data.configured === false: render the page with an <EmptyState> / info card explaining RevenueCat isn't connected yet,
  showing data.note, and a link/button hint pointing to CHROME-PROMPTS.md (just text). Still show the header.
- If configured: a grid-4 of <div className="stat"> tiles: Total subscribers, Active, MRR (fmtMoney), ARR (fmtMoney),
  and a grid-3/grid-4 second row: Free vs Paid (freeCount/paidCount), Trials, Churn (fmtPct), New this week, New this month.
  Use fmtNum/fmtMoney/fmtPct; show '—' for null (the formatters already do).
- If revenueSeries.length: a card titled "Revenue over time" with a recharts ResponsiveContainer (height 280) LineChart
  over revenueSeries ({date,value}); style the line with stroke 'var(--accent)', grid stroke 'var(--border)', tick fill 'var(--text-faint)'.
- Refresh button in the header actions.`,
  },
  {
    name: 'AiMonitoring',
    file: `${ADMIN}/src/pages/AiMonitoring.tsx`,
    spec: `File: src/pages/AiMonitoring.tsx. export function AiMonitoring().
Two data sources: aiApi.usage() -> AiUsageSummary, and aiApi.queries() -> {queries:AiQuery[], enabled:boolean}.
- Top: grid-3 stat tiles Today / This week / This month (usage.today/week/month). Add a stat-sub note on week/month like
  "approx — current window" (the backend can only retain ~24h of counters; mention briefly).
- Card "Top users by AI usage": table of usage.byUser (email||user_id mono, count).
- Card "High usage (50+/hr)": table of usage.highUsage with a badge-amber flag; <EmptyState> "No high-usage users" when empty.
- Card "Query content log": if queries.enabled === false, render an info <EmptyState> explaining AI query logging is OFF by
  default for privacy (mention the ai_query_logging flag + DECISIONS.md). If enabled, a table of queries (time fmtDateTime,
  user mono, mode badge, question truncated, response truncated) with a row click -> Modal showing full question + response.
- Refresh button.`,
  },
  {
    name: 'AppHealth',
    file: `${ADMIN}/src/pages/AppHealth.tsx`,
    spec: `File: src/pages/AppHealth.tsx. export function AppHealth().
healthApi.status() -> AppHealth, healthApi.errors() -> {errors: ErrorLogEntry[]}.
- grid-4 stat tiles:
  1) Supabase: a dot (dot-green if supabase.ok else dot-red) + "Connected"/"Down" + latency stat-sub (fmtNum ms).
  2) RevenueCat webhook: dot (green if ok) + "Last event" fmtRelative(lastEventAt).
  3) Active users: stat-value activeUsers.last24h with stat-sub "24h" and a second tile or sub for last7d.
  4) Errors (24h): stat-value errors24h (badge-red if >0).
- Card "Recent errors": table of errors (time fmtDateTime, fn badge, kind, message mono truncated). <EmptyState> when none.
- Auto-refresh: refetch every 30s (react-query refetchInterval) + a manual Refresh button.`,
  },
  {
    name: 'Leads',
    file: `${ADMIN}/src/pages/Leads.tsx`,
    spec: `File: src/pages/Leads.tsx. export function Leads().
leadsApi.list({type}) / create / update / remove / invite.
- A type filter as two tabs/segmented buttons: "Waitlist" (type='waitlist') and "Testers" (type='tester'). Track active type in state; refetch on change (queryKey includes type).
- Table columns: a checkbox (row select for bulk invite), Name, Email, Source (badge), Status (an inline <select> that calls
  leadsApi.update(id,{status}) on change — waitlist statuses: waitlist/invited/converted/dead; tester statuses: applied/accepted/active/dropped),
  IG handle (only meaningful for testers), Created (fmtDate), Notes (a small "edit" button opening a Modal with a textarea -> update).
- Header actions: "Add lead" (Modal: name,email,source,instagram_handle,notes; type defaults to the active tab) ;
  "Export CSV" (downloadCsv of the filtered leads); "Invite selected" (disabled unless rows selected -> leadsApi.invite(ids),
  toast the {invited,failed,note}); Refresh.
- Invalidate ['leads', type] after mutations. Toasts on success/error.`,
  },
  {
    name: 'Announcements',
    file: `${ADMIN}/src/pages/Announcements.tsx`,
    spec: `File: src/pages/Announcements.tsx. export function Announcements().
announcementsApi.list/create/update/remove.
- Header action "New announcement" -> Modal form: title (input), body (textarea), segment (select all/free/trial/premium),
  active (checkbox), starts_at + ends_at (datetime-local inputs, optional -> ISO or null).
- List as cards (not a table): each card shows title, a badge for segment, a badge-green "Live"/badge-gray "Inactive"
  (compute live = active && within window using the dates), body (muted, clamped), the window dates (fmtDateTime), and
  Edit + Delete buttons. Edit reuses the same Modal prefilled. Delete uses ConfirmModal.
- Empty state when none. Invalidate ['announcements'] after mutations; toasts.`,
  },
  {
    name: 'Push',
    file: `${ADMIN}/src/pages/Push.tsx`,
    spec: `File: src/pages/Push.tsx. export function Push().
pushApi.send / history.
- Left (or top) card "Compose": title (input), body (textarea), segment (select all/free/trial/premium), and an optional
  "specific user id" input (when filled, overrides segment -> pass userId). A "Send" button -> pushApi.send(...). Confirm via
  ConfirmModal before sending to 'all'. On success toast \`Sent {ok}/{sent} ({errors} errors)\` and invalidate history.
  Validate title+body non-empty (disable button).
- Card "History": table from pushApi.history() -> {log: PushLogEntry[]}: time (fmtDateTime), title, segment badge,
  target (target_user_id mono or '—'), sent/ok/errors counts. EmptyState when none.
- Note somewhere small that push requires the app to register Expo tokens (the admin-integration app change) + a note that
  segment 'trial' is best-effort. Refresh button.`,
  },
  {
    name: 'Compounds',
    file: `${ADMIN}/src/pages/Compounds.tsx`,
    spec: `File: src/pages/Compounds.tsx. export function Compounds().
compoundsApi.list/upsert/toggle/remove. Compound type in types.
- If data.source === 'empty': prominent info card: "No server compounds yet — the app is using its bundled compounds.js
  fallback. Seed the table to start editing (see scripts/seed-compounds.md)." Still allow "Add compound".
- Table: Name (+ oneLiner faint below), Category (primaryCategory), Research badge (map researchStatusBadge to a colored badge:
  'FDA Approved'->green, 'Clinical'->blue, 'Early Clinical'->amber, 'Preclinical'->gray, 'Dev Abandoned'->red, else gray),
  Visible (a toggle button calling compoundsApi.toggle(id,!hidden) — show "Visible"/"Hidden"), and Edit/Delete.
- "Add compound" + Edit open a Modal (wide) with fields: id (disabled when editing), name, primaryCategory, researchStatusBadge
  (select of the 5 enum values), oneLiner (input), legalStatus (input), whatItIs (textarea), howItWorks (textarea), and
  benefits/sideEffects/categories/aka as newline- or comma-separated textareas mapped to string[]. Build the Compound object
  and call compoundsApi.upsert(compound).
- ConfirmModal for delete. Invalidate ['compounds']; toasts. Keep the form pragmatic — these are the editable fields.`,
  },
  {
    name: 'Tickets',
    file: `${ADMIN}/src/pages/Tickets.tsx`,
    spec: `File: src/pages/Tickets.tsx. export function Tickets().
ticketsApi.list(status)/get/reply/setStatus/setPriority. Ticket/TicketMessage types.
- Status filter tabs: All / Open / In progress / Resolved / Closed (maps to status arg; 'All' = undefined). Show the openCount
  as a badge in the PageHeader subtitle (e.g. "{openCount} open").
- Table: Subject (+ created fmtRelative faint), User (email||user_id mono), Priority (badge-red 'urgent' / badge-gray 'normal'),
  Status (badge), Messages (messageCount). Row click -> open a wide Modal detail.
- Detail Modal (ticketsApi.get(id)): header with subject; controls to change status (select -> setStatus) and priority
  (select -> setPriority); the message thread (each message: author badge [admin=blue, user=gray], 'internal' badge-amber if internal,
  body, time fmtDateTime); a reply box (textarea) with an "Internal note" checkbox + Send button -> reply(id, body, internal).
- Invalidate ['tickets', status] and the detail query after mutations; toasts. EmptyState when no tickets.`,
  },
  {
    name: 'Settings',
    file: `${ADMIN}/src/pages/Settings.tsx`,
    spec: `File: src/pages/Settings.tsx. export function Settings().
Three sections (cards), each with its own query/mutations:
1) "Admin users" — adminsApi.list/add/remove. Table of admins (email, role badge, added_at fmtDate, Remove button w/ ConfirmModal).
   "Add admin" form: email input + role (default 'founder') + Add button -> adminsApi.add(email, role). Show the backend error
   (e.g. "No auth user with email …") as a toast — note the founder must sign in once first.
2) "Feature flags & limits" — flagsApi.list/set. Table of flags (key, description faint, value). For each flag render an
   appropriate editor: booleans (true/false) as a toggle button -> flagsApi.set(key,!value); numbers (e.g. free_daily_limit)
   as a small number input + Save -> flagsApi.set(key, Number). For 'ai_query_logging' specifically, show a badge-amber
   "PRIVACY" warning next to it and a ConfirmModal before enabling (it stores users' health questions — see DECISIONS.md).
3) "Consent versions" — consentApi.list/publish. Group versions by kind; show current active version number + created_at;
   a "Publish new version" form (kind select: ai/tos/privacy + body textarea) -> consentApi.publish(kind, body) which
   auto-increments the version. List prior versions (version, fmtDate, active badge).
Invalidate the matching query keys after each mutation; toasts throughout.`,
  },
]

// ============================================================
// RUN — both phases concurrently (functions + pages are independent)
// ============================================================
log(`Generating ${FUNCTIONS.length} edge functions + ${PAGES.length} pages…`)

const [fnResults, pageResults] = await Promise.all([
  parallel(
    FUNCTIONS.map((f) => () =>
      agent(
        `${FN_PREAMBLE}\n\n=== YOUR FUNCTION: ${f.name} ===\nWrite ${HEALTH}/supabase/functions/${f.name}/index.ts\n\n${f.spec}`,
        { label: `fn:${f.name}`, phase: 'Edge functions', schema: RESULT },
      ),
    ),
  ),
  parallel(
    PAGES.map((p) => () =>
      agent(
        `${PAGE_PREAMBLE}\n\n=== YOUR PAGE: ${p.name} ===\n${p.spec}`,
        { label: `page:${p.name}`, phase: 'Dashboard pages', schema: RESULT },
      ),
    ),
  ),
])

return {
  functions: fnResults.filter(Boolean),
  pages: pageResults.filter(Boolean),
}
