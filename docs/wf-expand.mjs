export const meta = {
  name: 'bluprint-admin-expand',
  description: 'Security retrofit + new admin functions + new dashboard pages',
  phases: [
    { title: 'Retrofit functions' },
    { title: 'New functions' },
    { title: 'New pages' },
  ],
}

const HEALTH = '/Users/jettarch/Projects/bluprint-health'
const ADMIN = '/Users/jettarch/Projects/bluprint-admin'

const RESULT = {
  type: 'object',
  additionalProperties: false,
  required: ['file', 'status', 'summary'],
  properties: {
    file: { type: 'string' },
    status: { type: 'string', enum: ['done', 'partial', 'failed'] },
    verified: { type: 'boolean' },
    summary: { type: 'string' },
    followups: { type: 'string' },
  },
}

const ESBUILD = `Then VERIFY: cd ${HEALTH} && npx esbuild supabase/functions/<NAME>/index.ts --log-level=error >/dev/null && echo OK  (exit 0 = pass; set verified accordingly).`

const GUARD_NOTE = `The shared guard now supports roles + audit. requireAdmin(req, {name, max, minRole}) returns {userId, role} or a Response. Roles high→low: owner > admin > support > readonly. Import { requireAdmin, serviceClient, readBody, audit, rankOf } from '../_shared/adminGuard.ts'. After a successful MUTATION, call:
  await audit({ actorId: userId, action: '<verb>', targetType: '<type>', targetId: '<id>', reason: <reason||null>, meta: { ...nonSecretSummary } })
audit() is best-effort (never throws). NEVER put secrets in meta.`

// ---------- PHASE 1: retrofit existing functions ----------
const FN_EDITS = [
  {
    name: 'admin-users',
    spec: `MINIMAL targeted edits only; preserve all current behavior.
1. Add minRole: change requireAdmin(req, { name: 'admin-users' }) → requireAdmin(req, { name: 'admin-users', minRole: 'readonly' }).
2. COMP-AWARENESS: the build now must reflect manual comps (admin_comps table) too, since comps moved OUT of entitlements (migration 20260617000012). Fetch all admin_comps rows (user_id, active, expires_at, reason, granted_by, updated_at). When building each AdminUser: compute comp-live = comp.active && (!comp.expires_at || comp.expires_at>now). If the user has NO live entitlements row but DOES have a live comp, synthesize entitlement = { user_id, entitlement:'premium', active:true, expires_at: comp.expires_at, product_id:null, source:'admin_grant', granted_by: comp.granted_by, reason: comp.reason, updated_at: comp.updated_at } so plan shows 'premium'. Keep the existing expires_at-honoring logic for real entitlements. No audit (read-only).`,
  },
  {
    name: 'admin-delete-user',
    spec: `1. minRole: 'owner' (destructive). 2. Accept an optional { reason } string in the body. 3. After a successful deleteUser, call audit({ actorId, action:'delete_user', targetType:'user', targetId:userId, reason, meta:{} }). Keep all existing purge logic.`,
  },
  {
    name: 'admin-leads',
    spec: `1. minRole: 'support'. 2. Audit after each successful mutation: create→audit('create_lead', target 'lead', id=lead.id), update→audit('update_lead', id), delete→audit('delete_lead', id). list = no audit. Use the founder userId from requireAdmin as actorId.`,
  },
  {
    name: 'admin-invite-leads',
    spec: `1. minRole: 'support'. 2. After sending, audit({actorId, action:'invite_leads', targetType:'lead', meta:{ count: ids.length, invited, failed }}). Keep the RESEND_API_KEY behavior.`,
  },
  {
    name: 'admin-announcements',
    spec: `1. minRole: 'admin'. 2. Audit: create→audit('create_announcement', id), update→audit('update_announcement', id), delete→audit('delete_announcement', id).`,
  },
  {
    name: 'admin-compounds',
    spec: `1. minRole: 'admin'. 2. VERSION HISTORY: on a successful upsert, ALSO insert a row into compound_versions { compound_id: id, data: <the full compound object you stored>, edited_by: userId } (best-effort; don't fail the upsert if the version insert errors). 3. Add two NEW actions:
   - {action:'versions', id} -> { versions: [...] }  (compound_versions for that id, created_at desc)
   - {action:'restore', id, versionId} -> { compound }  (load that version's data, re-upsert it as current via the same mapping, snapshot a new version, return the Compound)
4. Audit upsert→audit('edit_compound', target 'compound', id), toggle→audit('toggle_compound', id, meta:{hidden}), delete→audit('delete_compound', id), restore→audit('restore_compound', id, meta:{versionId}). Match the existing list/upsert response shapes.`,
  },
  {
    name: 'admin-flags',
    spec: `PER-ACTION role enforcement (the function is multiplexed). Call requireAdmin(req, { name:'admin-flags', minRole:'readonly' }) so reads work, then INSIDE the handler enforce higher roles with rankOf(role):
   - read actions (whoami, list, consentList, adminsList): readonly OK.
   - write actions (set, delete, consentPublish): require rankOf(role) >= rankOf('admin') else return json({error:'Requires admin access.'},403).
   - admin management (adminsAdd, adminsRemove): require rankOf(role) >= rankOf('owner') else 403.
Audit every write: set→audit('set_flag', target 'flag', id=key, meta:{value}), delete→audit('delete_flag', key), consentPublish→audit('publish_consent', target 'consent', meta:{kind,version}), adminsAdd→audit('add_admin', target 'admin', meta:{email,role}), adminsRemove→audit('remove_admin', target 'admin', id=userId). Keep all existing response shapes. NOTE: kill switches are just feature_flags set via the 'set' action — no special handling needed.`,
  },
  {
    name: 'admin-send-push',
    spec: `1. minRole: 'admin'. 2. After a send, audit({actorId, action:'send_push', targetType: userId?'user':'segment', targetId: userId||segment, meta:{ sent, ok, errors }}). Keep Expo send + history.`,
  },
  {
    name: 'admin-tickets',
    spec: `1. minRole: 'support'. 2. Audit: reply→audit('reply_ticket', target 'ticket', id), status→audit('ticket_status', id, meta:{status}), priority→audit('ticket_priority', id, meta:{priority}). 3. Timing: on a reply, if the ticket has no first_response_at yet, set tickets.first_response_at=now. On status change to 'resolved' or 'closed', set tickets.resolved_at=now (if not already). 4. Add NEW actions:
   - {action:'escalate', id, escalated:boolean} -> { ticket }  (set tickets.escalated; audit('ticket_escalate', id, meta:{escalated}))
   - {action:'tags', id, tags:string[]} -> { ticket }  (set tickets.tags; audit('ticket_tags', id))
   - {action:'cannedList'} -> { canned: [...] }  (canned_responses ordered title)
Keep existing list/get/reply/status/priority shapes (Ticket type now also has tags/csat/escalated/first_response_at/resolved_at).`,
  },
]

// ---------- PHASE 2: new functions ----------
const NEW_FNS = [
  {
    name: 'admin-audit',
    spec: `READ the audit log. requireAdmin(minRole:'readonly'). Body { limit?, action?, actorId? } -> { entries: AuditEntry[] }.
Select from admin_audit_log ordered created_at desc, limit default 200; filter by action/actor_id when given. ENRICH actor_email: collect distinct actor_ids, look them up via admin.auth.admin.getUserById (or skip + null if too many). Match the AuditEntry type in ${ADMIN}/src/types/index.ts.`,
  },
  {
    name: 'admin-overview',
    spec: `Home KPIs. requireAdmin(minRole:'readonly'). Body {} -> OverviewKpis (see types).
- users = count of user_state distinct user_ids OR auth listUsers total (use a count on user_state distinct, or listUsers total — pick the cheaper; document in followups).
- premium = count of active+unexpired entitlements rows; comped = count of active+unexpired admin_comps.
- dau/wau/mau = distinct user_id in analytics_events within 1/7/30 days; if analytics_events is empty, FALL BACK to distinct user_id in user_state by updated_at within 1/7/30 days (note the approximation). dauMauRatio = dau/mau (null if mau 0).
- newSubsWeek = count subscription_events type INITIAL_PURCHASE in last 7d (null if none/table empty).
- openTickets = tickets where status in (open,in_progress).
- errors24h = error_log last 24h.
- aiQueriesToday = sum of rate_limits coach buckets in last 24h (counts) OR ai_queries count today.
- aiCostToday = sum ai_queries.cost_usd today (null if logging off/empty).
- checkedAt = now ISO.`,
  },
  {
    name: 'admin-analytics',
    spec: `Growth + content intelligence, computed from EXISTING synced data + the analytics tables. requireAdmin(minRole:'readonly'). Body {} -> AnalyticsSummary (see types). Compute what's available; return empty arrays / null where data isn't flowing yet (and put a note in followups + the response 'note').
REAL data available now (compute these properly):
- Read all user_state rows for key='bp.profile.v1' → parse value JSON → goals (goalLabel), experience, genders distributions; healthFlagRate = % with non-empty healthFlags; physicianRate = % whose physician is set/has-physician.
- topBookmarked: read user_state key='bp.bookmarks.v1' (value is an array of compound ids) → tally counts across users, top 20.
- stackGraph: read user_state key='bp.protocol.items.v1' (array of protocol items; each has a compound id field — inspect shape, likely {id} or {compoundId}) → for each user's set of compound ids, count co-occurring PAIRS across users; return top 30 pairs {a,b,count}. Be defensive about the item shape.
- highRiskWatch: cross profiles that have healthFlags with protocols containing investigational/WADA-banned compounds — you can't know WADA status server-side without the compound table; approximate by: users with non-empty healthFlags AND a non-empty protocol; return {user_id,email,flags,compounds(ids)} top 50. Note the approximation.
- dau/wau/mau: from analytics_events if present else user_state.updated_at fallback (note it).
From analytics tables (may be empty until app instrumentation — return [] gracefully):
- topSearched + emptySearches (results_count=0) from search_log; trending = compare this-week vs prev-week query counts from search_log.
- scanMisses from scan_misses.
- funnel: count analytics_events by name for steps [app_open, onboarding_complete, compound_view, protocol_add, scan, subscribe] → [{step,count}].
- retention d1/d7/d30, featureAdoption, heatmap (dow×hour from analytics_events.created_at): compute if events exist else null/[].
Keep queries bounded (limit big selects to e.g. 5000 rows) and note any cap.`,
  },
  {
    name: 'admin-subscriptions',
    spec: `requireAdmin(minRole:'readonly'). Body {} -> SubscriptionsSummary (see types).
- events: subscription_events ordered event_at desc, limit 200 (enrich email best-effort).
- refunds: subscription_events where type ilike '%REFUND%' OR type='CANCELLATION' (treat refunds/cancellations) — actually filter type in ('REFUND','CANCELLATION'), limit 100.
- atRisk: (a) entitlements active with expires_at within next 48h, (b) admin_comps active with expires_at within 48h, (c) subscription_events type='BILLING_ISSUE' in last 7d → dedupe by user_id; return {user_id,email,reason,expires_at}.
- comped: admin_comps where active → {user_id,email,reason,granted_by,expires_at,created_at} (enrich email).
- configured: true if subscription_events has any rows OR entitlements non-empty; if subscription_events empty set note 'No RevenueCat events yet — feed populates once the webhook receives events.'`,
  },
  {
    name: 'admin-notes',
    spec: `User internal notes + flags. requireAdmin(minRole:'support'). Actions:
- {action:'list', userId} -> { notes: UserNote[], flags: UserFlag[] }  (notes desc; flags where active)
- {action:'addNote', userId, body} -> { note }  (insert user_notes author_id=actor; audit('add_note', target 'user', id=userId))
- {action:'addFlag', userId, flag, reason?} -> { flag }  (insert user_flags created_by=actor; audit('flag_user', id=userId, meta:{flag}))
- {action:'resolveFlag', id} -> { resolved: true }  (set user_flags.active=false; audit('resolve_flag', target 'flag', id))
Validate userId uuid + non-empty body/flag. Match types.`,
  },
  {
    name: 'admin-export',
    spec: `GDPR export + state inspector (sensitive). requireAdmin(minRole:'admin'). Actions:
- {action:'export', userId} -> { export: {...} }  (assemble: auth user (email/created_at via getUserById), all user_state rows, entitlements row, admin_comps row, user_notes, user_flags, tickets, ai_queries (if any)). audit('export_user', target 'user', id=userId).
- {action:'state', userId} -> { state: {...} }  (just the raw user_state key→value map for the support "view as user" / raw bp.* inspector). audit('view_as_user', target 'user', id=userId).
Validate uuid. This returns a user's own data to a founder for support/compliance — that's the point; it is audit-logged.`,
  },
  {
    name: 'admin-safety',
    spec: `AI safety review queue + adverse events + feedback. requireAdmin(minRole:'readonly'). Actions:
- {action:'summary'} -> SafetySummary (see types):
   - enabled = feature_flag ai_query_logging value===true.
   - flagged: if enabled, ai_queries where flagged=true ordered created_at desc limit 100, else [].
   - dosingHotspots / offLibraryMentions: derive from flagged ai_queries' flag_reason / meta if present, else [] (note these populate once the coach tags queries — return [] gracefully).
   - adverse: adverse_events ordered created_at desc limit 100 (enrich email).
   - feedback: feedback ordered created_at desc limit 100 (enrich email).
   - note if logging disabled.
- {action:'resolveAdverse', id, status} -> { adverse }  (update adverse_events.status; validate status in new|reviewing|resolved|escalated; audit('resolve_adverse', target 'adverse', id, meta:{status}); minRole check support+ for this write — enforce rankOf(role)>=rankOf('support') inside).`,
  },
  {
    name: 'admin-cost',
    spec: `AI cost tracking from ai_queries. requireAdmin(minRole:'readonly'). Body {} -> CostSummary (see types).
- enabled = ai_query_logging flag value===true. If not enabled OR ai_queries empty, return enabled:false, zeros/[], note 'AI logging is OFF — cost tracking populates when enabled.'
- If enabled: today = sum cost_usd where created_at>=today; month = sum where >= month start; byDay = group by date (last 30d) [{date,cost}]; byModel = group by model [{model,cost,count}]; byUser = group by user_id top 20 [{user_id,cost,email?}] (enrich email best-effort); cacheHitRate = avg(cache_read>0) or sum(cache_read)/sum(tokens_in) if available else null; projected30d = (month-to-date / day-of-month) * 30 (rough) or 30*avg daily. Be defensive (cost_usd may be null on rows).`,
  },
  {
    name: 'admin-growth',
    spec: `Growth tooling CRUD. requireAdmin(minRole:'admin'). Actions (match growthApi in api.ts):
- referralList -> {codes}; referralCreate {code, ownerLabel?} -> {code} (insert referral_codes; audit('create_referral', id=code))
- discountList -> {codes}; discountCreate {discount:{code,percent_off,expires_at,max_redemptions}} -> {code} (insert discount_codes; audit('create_discount', id=code))
- segmentList -> {segments}; segmentCreate {name, definition} -> {segment} (insert saved_segments created_by=actor; audit('create_segment', id))
- cannedList -> {canned}; cannedCreate {title, body} -> {canned} (insert canned_responses created_by=actor; audit('create_canned', id))
Match the ReferralCode/DiscountCode/SavedSegment/CannedResponse types.`,
  },
]

// ---------- PHASE 3: new dashboard pages ----------
const NEW_PAGES = [
  {
    name: 'Overview',
    file: 'src/pages/Overview.tsx',
    spec: `export function Overview(). overviewApi.kpis() -> OverviewKpis. A founder home screen: a grid-4 (then grid-3) of stat tiles — Users, Premium, Comped, DAU, WAU, MAU, DAU/MAU ratio (fmtPct), New subs (7d), Open tickets, Errors 24h, AI queries today, AI cost today (fmtMoney). Use dot-red/badge-red emphasis when errors24h>0 or open tickets>0. A short "as of <fmtRelative(checkedAt)>" line. Refresh button + refetchInterval 60s. Mirror Users.tsx style.`,
  },
  {
    name: 'Analytics',
    file: 'src/pages/Analytics.tsx',
    spec: `export function Analytics(). analyticsApi.summary() -> AnalyticsSummary. Sections (cards):
- top: grid-3 DAU/WAU/MAU tiles + DAU/MAU ratio + health-flag rate (fmtPct) + physician rate.
- "Goals" / "Experience" / "Gender" distributions: simple horizontal bars (a div with width %=count/max) inside cards. Use recharts BarChart OR plain CSS bars (CSS bars are fine + lighter).
- "Most bookmarked compounds" table (id, count); "Top searches" table; "Content gaps (no results)" table (emptySearches); "Scan misses" table; "Trending" table (query, count, prev).
- "Real-world stack graph" table (a, b, count) — co-occurring compounds.
- "High-risk watch list" table (email/user_id, flags, compounds) with a badge-red marker.
- funnel: if funnel has data, a vertical list of steps with counts + drop-off %; else EmptyState "No event data yet — ships once app analytics are enabled."
Every section that has an empty array shows a small muted "No data yet". Respect data.note. Refresh button.`,
  },
  {
    name: 'Subscriptions',
    file: 'src/pages/Subscriptions.tsx',
    spec: `export function Subscriptions(). subscriptionsApi.summary() -> SubscriptionsSummary. Cards:
- "At-risk" table (email, reason, expires fmtRelative) — badge-amber.
- "Comped users" table (email, reason, granted_by mono, expires, created) — badge-purple "comp".
- "Refunds & cancellations" table (event_at fmtDateTime, email, type badge-red, product, price fmtMoney).
- "Recent subscription events" table (event_at, email, type badge, product, store, price).
If data.configured===false or events empty, show data.note in an info card but still render comped/at-risk (those come from entitlements/comps). Refresh.`,
  },
  {
    name: 'Audit',
    file: 'src/pages/Audit.tsx',
    spec: `export function Audit(). auditApi.list({limit:200}) -> { entries: AuditEntry[] }. A filterable table of every privileged action: time (fmtDateTime), actor (actor_email||actor_id mono), action (badge — color by category: delete_*/revoke_*=red, grant_*/add_admin=green, edit_*/set_*/send_*=blue, else gray), target (target_type:target_id mono), reason, meta (small mono JSON, truncated). A text filter box (client-side) over action/actor/target. Header note: "Every privileged action is recorded." Refresh. EmptyState when none.`,
  },
  {
    name: 'Safety',
    file: 'src/pages/Safety.tsx',
    spec: `export function Safety(). safetyApi.summary() -> SafetySummary; safetyApi.resolveAdverse(id,status). Cards:
- "AI safety queue": if !enabled show an info EmptyState explaining AI logging is OFF (flagged conversations populate when enabled + DECISIONS.md). If enabled, a table of flagged ai_queries (time, user mono, flag_reason badge-amber, question truncated) → row click opens a Modal with full question+response.
- "Dosing-request hotspots" + "Off-library AI mentions": tables (compound, count) or EmptyState.
- "Adverse event reports": table (time, email, compound_id, severity badge [severe=red,moderate=amber,mild=gray], description truncated, status) with a status <select> calling resolveAdverse(id, status). badge for status.
- "User feedback": table (time, email, rating, body truncated).
Respect note. Refresh.`,
  },
  {
    name: 'Cost',
    file: 'src/pages/Cost.tsx',
    spec: `export function Cost(). costApi.summary() -> CostSummary. If !enabled, info EmptyState (AI logging OFF → cost tracking populates when enabled; mention Anthropic spend). If enabled:
- grid-3 tiles: Spend today (fmtMoney), Spend this month (fmtMoney), Projected 30d (fmtMoney) + cache hit rate (fmtPct) tile.
- "Cost by day" — recharts LineChart (height 240) over byDay {date,cost} (stroke var(--text), monochrome, tooltip styled like Revenue.tsx).
- "Cost by model" table (model, count, cost).
- "Top users by cost" table (email||user_id mono, cost fmtMoney).
Respect note. Refresh.`,
  },
  {
    name: 'Growth',
    file: 'src/pages/Growth.tsx',
    spec: `export function Growth(). growthApi.* . Three/four cards with list + create:
- "Referral codes": table (code mono, owner, uses, conversions, active) + "New code" form (code, owner label) → createReferral.
- "Discount codes": table (code, % off, expires, redemptions/max, active) + "New" form (code, percent_off, expires_at, max_redemptions) → createDiscount.
- "Saved segments": table (name, definition mono) + "New segment" form (name, definition as a small JSON textarea parsed to object) → createSegment.
- "Canned responses": table (title, body truncated) + "New" form (title, body) → createCanned.
Invalidate the matching query keys; toasts. Mirror Leads.tsx form/modal style.`,
  },
]

// ---------- RUN ----------
log(`Retrofitting ${FN_EDITS.length} functions, writing ${NEW_FNS.length} new functions + ${NEW_PAGES.length} pages…`)

const fnEditPrompt = (f) =>
  `You are EDITING an existing Supabase Edge Function for the Bluprint admin dashboard. Work in ${HEALTH}.
READ FIRST: ${HEALTH}/supabase/functions/${f.name}/index.ts (the file you edit), ${HEALTH}/supabase/functions/_shared/adminGuard.ts, and the relevant migration(s) in ${HEALTH}/supabase/migrations/ (esp. 20260617000012_admin_security.sql for admin_comps/audit, 000013/000014/000015 for new tables).
${GUARD_NOTE}
Make ONLY the changes below — preserve every other behavior, response key, and import. Be surgical.
=== ${f.name} ===
${f.spec}
${ESBUILD.replace('<NAME>', f.name)}
Return the structured result.`

const newFnPrompt = (f) =>
  `You are writing ONE new Supabase Edge Function for the Bluprint admin dashboard. Work in ${HEALTH}. Write ${HEALTH}/supabase/functions/${f.name}/index.ts.
READ FIRST: ${HEALTH}/supabase/functions/_shared/adminGuard.ts (requireAdmin/serviceClient/readBody/audit), ${HEALTH}/supabase/functions/_shared/anthropic.ts (cors,json), ${HEALTH}/supabase/functions/admin-users/index.ts (reference style), the relevant migrations, and the response types in ${ADMIN}/src/types/index.ts + the request contract in ${ADMIN}/src/lib/api.ts (match key names + nesting EXACTLY).
Standard skeleton: OPTIONS→cors; const g = await requireAdmin(req,{name:'${f.name}', minRole:...}); if (g instanceof Response) return g; const {userId, role}=g; const body=await readBody(req); const admin=serviceClient() (wrap in try→503); route on body.action; catch→500. NEVER read/return secrets.
=== ${f.name} ===
${f.spec}
${ESBUILD.replace('<NAME>', f.name)}
Return the structured result.`

const pagePrompt = (p) =>
  `You are writing ONE React+TS page for the Bluprint admin dashboard. Work in ${ADMIN}. Write ${ADMIN}/${p.file}.
READ FIRST: ${ADMIN}/src/pages/Users.tsx and ${ADMIN}/src/pages/Revenue.tsx (reference style + recharts usage), ${ADMIN}/src/lib/api.ts (call only the documented methods), ${ADMIN}/src/types/index.ts, ${ADMIN}/src/components/Layout.tsx (Page, PageHeader), ${ADMIN}/src/components/ui.tsx (Loading, EmptyState, ErrorBanner, Modal, ConfirmModal, useToast), ${ADMIN}/src/lib/format.ts, ${ADMIN}/src/theme/global.css (design-system classes).
RULES: export the NAMED component exactly as specified; @tanstack/react-query for data; surface loading/error/empty states; toasts + query invalidation on mutations; use ONLY existing CSS classes (card, stat, btn/btn-primary/btn-gradient/btn-danger/btn-sm, input/textarea/select/label/field, table/mono/row-click, badge-{gray,green,amber,red,blue,purple}, dot-*, grid-2/3/4, row/between/gap-*/muted/faint/right/nowrap/tabnum, modal, empty); recharts only where specified (monochrome: stroke var(--text), grid var(--border), tooltip contentStyle like Revenue.tsx); TypeScript strict + noUnusedLocals (no unused imports, type everything, no \`any\`). Self-contained single file. Match the visual density of Users.tsx. Set verified:false (the orchestrator runs the full build).
=== ${p.name} (${p.file}) ===
${p.spec}
Return the structured result.`

const [edits, newFns, pages] = await Promise.all([
  parallel(FN_EDITS.map((f) => () => agent(fnEditPrompt(f), { label: `edit:${f.name}`, phase: 'Retrofit functions', schema: RESULT }))),
  parallel(NEW_FNS.map((f) => () => agent(newFnPrompt(f), { label: `fn:${f.name}`, phase: 'New functions', schema: RESULT }))),
  parallel(NEW_PAGES.map((p) => () => agent(pagePrompt(p), { label: `page:${p.name}`, phase: 'New pages', schema: RESULT }))),
])

return { edits: edits.filter(Boolean), newFns: newFns.filter(Boolean), pages: pages.filter(Boolean) }
