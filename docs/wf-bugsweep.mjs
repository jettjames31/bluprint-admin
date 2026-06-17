export const meta = {
  name: 'bluprint-admin-bugsweep',
  description: 'Adversarial real-data/runtime bug sweep across deployed functions + dashboard pages',
  phases: [{ title: 'Functions' }, { title: 'Pages' }, { title: 'Auth/integration' }],
}

const H = '/Users/jettarch/Projects/bluprint-health'
const A = '/Users/jettarch/Projects/bluprint-admin'

const FINDING = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'verdict', 'findings'],
  properties: {
    area: { type: 'string' },
    verdict: { type: 'string', enum: ['clean', 'issues', 'broken'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'location', 'problem', 'fix', 'confidence'],
        properties: {
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          location: { type: 'string' },
          problem: { type: 'string' },
          fix: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    summary: { type: 'string' },
  },
}

const FN_PRE = `You are hunting REAL bugs in DEPLOYED Supabase Edge Functions (Deno/TS) for the Bluprint admin
dashboard. The whole backend is live; founders are about to use it. Focus on bugs that bite at
RUNTIME with REAL data — not style. Read each function in ${H}/supabase/functions/<name>/index.ts,
the shared helpers (_shared/adminGuard.ts, guard.ts, anthropic.ts), and THE LIVE SCHEMA in
${H}/supabase/migrations/*.sql (the deployed tables/columns/RLS/RPCs). Also cross-check response
shapes against ${A}/src/types/index.ts and the request contract in ${A}/src/lib/api.ts.

Look hard for:
- Querying a column/table that doesn't exist or is named differently in the migrations (typos,
  wrong snake_case, joins that don't exist). This is the #1 class — verify every .from()/.select()
  column against the actual migration.
- Response shape mismatches: the function returns keys the page/types DON'T expect, or omits keys
  they DO (e.g. {users,total} vs {data}). Empty-result handling ([] vs null).
- .single() where 0 rows is expected (throws PGRST116) vs .maybeSingle(); missing await; unhandled
  promise; wrong supabase-js call form.
- RLS/service-role assumptions (service role bypasses RLS — but does the query rely on auth.uid()?).
- aiUsage/analytics aggregation logic that would crash or mislead on real data.
- Anything that 500s on a normal request.
Report ONLY real issues with a concrete one-line fix + confidence. If solid, verdict 'clean', findings [].`

const PAGE_PRE = `You are hunting REAL runtime bugs in deployed React+TS dashboard pages for Bluprint admin.
Read each page in ${A}/src/pages/<Name>.tsx plus ${A}/src/lib/api.ts, ${A}/src/types/index.ts,
${A}/src/components/ui.tsx, ${A}/src/lib/format.ts. The functions return REAL data now (and
sometimes empty/null). Find bugs that throw or render wrong:
- Destructuring/rendering a field the API response does NOT actually contain (mismatch with the
  edge function's real return shape — check the function in ${H}/supabase/functions/<name>/index.ts).
- .map()/.length/.toFixed() on a value that can be undefined/null (empty data, "not configured",
  logging-disabled states). Missing optional chaining.
- react-query usage bugs (queryKey collisions, missing invalidation, mutation error handling).
- recharts on empty/null series; number formatting on null.
- Loading/error/empty states that never render or crash.
Report ONLY real issues with a concrete one-line fix + confidence. Verdict 'clean' if solid.`

const FN_GROUPS = [
  { area: 'fn:reads-aggregation', list: 'admin-users, admin-overview, admin-analytics, admin-subscriptions, admin-audit' },
  { area: 'fn:mutations-sensitive', list: 'admin-grant-premium, admin-delete-user, admin-notes, admin-export, admin-flags' },
  { area: 'fn:content-crud', list: 'admin-compounds, admin-announcements, admin-leads, admin-invite-leads, admin-send-push' },
  { area: 'fn:rest', list: 'admin-safety, admin-cost, admin-growth, admin-tickets, admin-ai-queries' },
  { area: 'fn:live-endpoints+config', list: 'revenuecat-webhook, coach, analyze-plate, analyze-physique, explain-ingredient, lead-capture — ALSO sanity-check which functions truly need verify_jwt OFF (only revenuecat-webhook + lead-capture; flag any other that would break called with a non-JWT)' },
]

const PAGE_GROUPS = [
  { area: 'page:overview-users-subs-revenue', list: 'Overview, Users, Subscriptions, Revenue' },
  { area: 'page:analytics-ai-cost-safety', list: 'Analytics, AiMonitoring, Cost, Safety' },
  { area: 'page:leads-announce-push-audit', list: 'Leads, Announcements, Push, Audit' },
  { area: 'page:compounds-tickets-settings-growth-health', list: 'Compounds, Tickets, Settings, Growth, AppHealth' },
]

log('Bug sweep: functions + pages + auth/integration…')

const [fns, pages, auth] = await Promise.all([
  parallel(
    FN_GROUPS.map((g) => () =>
      agent(`${FN_PRE}\n\n=== REVIEW THESE FUNCTIONS: ${g.list} ===`, { label: g.area, phase: 'Functions', schema: FINDING }),
    ),
  ),
  parallel(
    PAGE_GROUPS.map((g) => () =>
      agent(`${PAGE_PRE}\n\n=== REVIEW THESE PAGES: ${g.list} ===`, { label: g.area, phase: 'Pages', schema: FINDING }),
    ),
  ),
  parallel([
    () =>
      agent(
        `Hunt real bugs in the dashboard auth + app shell + API client. Read ${A}/src/lib/auth.tsx, ${A}/src/App.tsx, ${A}/src/pages/Login.tsx, ${A}/src/components/Layout.tsx, ${A}/src/lib/api.ts, ${A}/src/lib/supabase.ts, and the whoami path in ${H}/supabase/functions/admin-flags/index.ts. Check: the sign-in → whoami → allowlist gate (does a seeded founder actually reach the app? does the "access denied" state recover after seeding without a hard reload? is recheckAdmin wired?), session handling, the api call() bearer/apikey headers + error extraction, route guards in App.tsx, and any state that could trap a valid founder out. Report real issues + concrete fixes + confidence; verdict clean if solid.`,
        { label: 'auth:flow', phase: 'Auth/integration', schema: FINDING },
      ),
  ]),
])

return { functions: fns.filter(Boolean), pages: pages.filter(Boolean), auth: auth.filter(Boolean) }
