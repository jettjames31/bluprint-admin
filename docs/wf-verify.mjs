export const meta = {
  name: 'bluprint-admin-verify',
  description: 'Adversarially verify each edge function matches the dashboard API contract + the consuming page',
  phases: [{ title: 'Verify contracts' }],
}

const HEALTH = '/Users/jettarch/Projects/bluprint-health'
const ADMIN = '/Users/jettarch/Projects/bluprint-admin'

const FINDING = {
  type: 'object',
  additionalProperties: false,
  required: ['fn', 'verdict', 'issues'],
  properties: {
    fn: { type: 'string' },
    verdict: { type: 'string', enum: ['matches', 'minor-issues', 'broken'] },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'where', 'problem', 'fix'],
        properties: {
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
          where: { type: 'string', description: 'file:line or function/action' },
          problem: { type: 'string' },
          fix: { type: 'string', description: 'concrete one-line fix' },
        },
      },
    },
    summary: { type: 'string' },
  },
}

// function name -> consuming dashboard page(s)/module(s)
const MAP = {
  'admin-users': ['src/pages/Users.tsx', 'src/pages/AiMonitoring.tsx'],
  'admin-grant-premium': ['src/pages/Users.tsx'],
  'admin-delete-user': ['src/pages/Users.tsx'],
  'admin-leads': ['src/pages/Leads.tsx'],
  'lead-capture': ['(public landing page — no dashboard page; verify standalone)'],
  'admin-invite-leads': ['src/pages/Leads.tsx'],
  'admin-send-push': ['src/pages/Push.tsx'],
  'admin-announcements': ['src/pages/Announcements.tsx'],
  'admin-compounds': ['src/pages/Compounds.tsx'],
  'admin-flags': ['src/pages/Settings.tsx', 'src/lib/auth.tsx (whoami)'],
  'admin-revenue': ['src/pages/Revenue.tsx'],
  'admin-health': ['src/pages/AppHealth.tsx'],
  'admin-ai-queries': ['src/pages/AiMonitoring.tsx'],
  'admin-tickets': ['src/pages/Tickets.tsx'],
}

const PREAMBLE = `You are adversarially verifying ONE Supabase Edge Function against the dashboard's
fixed contract. Be skeptical — your job is to FIND mismatches, not to approve.

Read:
- The function: ${HEALTH}/supabase/functions/<FN>/index.ts
- The contract:  ${ADMIN}/src/lib/api.ts  (the EXACT request bodies + response shapes the dashboard sends/expects)
- The types:     ${ADMIN}/src/types/index.ts
- The consuming page(s): listed below (how the response is actually rendered)
- The shared guard: ${HEALTH}/supabase/functions/_shared/adminGuard.ts (so you know requireAdmin/serviceClient semantics)
- The relevant migration(s) in ${HEALTH}/supabase/migrations/ (so column names match the queries)

Check specifically:
1. Does the function handle EVERY action + param the api.ts method sends (exact string names)?
2. Does the function's returned JSON have the EXACT keys the page/types expect (names + nesting)?
   e.g. api expects {users, total} — does it return exactly those? {leads}? {flag}? {announcement}? {ticket, messages}?
3. Column names in queries match the migration (e.g. instagram_handle, granted_by, research_status_badge, target_user_id).
4. requireAdmin is called FIRST; serviceClient errors → 503; no secret is ever returned/logged.
5. Obvious runtime bugs (await missing, wrong supabase-js call shape, unhandled null, .single() vs .maybeSingle()).
Only report REAL issues. If it's correct, verdict 'matches' with issues:[]. Do NOT edit any file — report only.
Return the structured finding.`

const fns = Object.keys(MAP)
log(`Verifying ${fns.length} function↔contract seams…`)

const results = await parallel(
  fns.map((fn) => () =>
    agent(
      `${PREAMBLE}\n\n=== FUNCTION TO VERIFY: ${fn} ===\nConsuming page(s)/module(s): ${MAP[fn].map((p) => (p.startsWith('(') ? p : `${ADMIN}/${p}`)).join(', ')}`,
      { label: `verify:${fn}`, phase: 'Verify contracts', schema: FINDING },
    ),
  ),
)

return results.filter(Boolean)
