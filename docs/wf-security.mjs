export const meta = {
  name: 'bluprint-admin-security-review',
  description: 'Adversarial security audit of the admin dashboard backend',
  phases: [{ title: 'Security audit' }],
}

const H = '/Users/jettarch/Projects/bluprint-health'

const FINDING = {
  type: 'object',
  additionalProperties: false,
  required: ['area', 'verdict', 'findings'],
  properties: {
    area: { type: 'string' },
    verdict: { type: 'string', enum: ['secure', 'issues', 'critical'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'location', 'issue', 'fix', 'confidence'],
        properties: {
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          location: { type: 'string' },
          issue: { type: 'string' },
          fix: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    summary: { type: 'string' },
  },
}

const PRE = `You are a SECURITY AUDITOR reviewing the Bluprint admin dashboard backend (Supabase
Edge Functions + Postgres migrations) at ${H}. Be adversarial and specific — find real
vulnerabilities, not style nits. This dashboard wields service-role power for 3 founders;
the bar is TIGHT.

Threat model + invariants to verify:
- Every admin-* function MUST call requireAdmin() FIRST (before any privileged work) and
  enforce an appropriate minRole. Destructive/admin-management = owner; mutations = admin;
  triage = support; reads = readonly. A signed-in NON-admin, or a lower-tier admin, must be
  cleanly rejected (401/403). The public anon key alone must never authorize anything.
- The service-role key and any secret (RevenueCat/Resend/Anthropic) must NEVER be returned
  to the client, logged in a way that reaches the client, or placed in audit meta.
- RLS: every new table must be service-role-only OR have correctly-scoped policies
  (insert-own / select-own with auth.uid() = user_id). No table should be unintentionally
  world-readable/writable by the anon/authenticated client.
- SQL/PostgREST injection: any value interpolated into a REST URL or filter must be safe
  (encodeURIComponent / parameterized). Watch raw string building.
- Input validation: uuids validated; action routing can't be abused; no unbounded work.
- Audit coverage: privileged mutations are recorded in admin_audit_log.

Read the files in your assignment PLUS the shared guard
(${H}/supabase/functions/_shared/adminGuard.ts and guard.ts) and the relevant migrations in
${H}/supabase/migrations/. Report ONLY real issues with concrete fixes. If an area is
solid, verdict 'secure' with findings []. Do NOT edit files. Return the structured finding.`

const AREAS = [
  {
    area: 'security-core',
    files: `_shared/adminGuard.ts, _shared/guard.ts, migrations 20260617000012_admin_security.sql. Verify: role rank map + get_admin_role RPC grants (service_role only), requireAdmin fail-closed behavior, audit() never leaks/throws, is_entitled/is_entitled_self grants (is_entitled_self to authenticated only; is_entitled service_role only), kill-switch reader can't be spoofed.`,
  },
  {
    area: 'comp-sub-split',
    files: `admin-grant-premium/index.ts, revenuecat-webhook/index.ts, src/lib/serverEntitlement.js, and is_entitled in migration 000012. VERIFY THE GOTCHA: admin-grant-premium writes ONLY admin_comps (never entitlements); the webhook writes ONLY entitlements (never admin_comps); revoke can't strip a paying sub; the webhook can't re-activate a pulled comp; is_entitled ORs both with expiry honored; the app reads via is_entitled_self only.`,
  },
  {
    area: 'rls-policies',
    files: `ALL new migrations 000012-000016. For EACH new table, state whether it's service-role-only or has client policies, and whether that's correct. Flag any table that an authenticated/anon client can read or write when it shouldn't (e.g., admin_audit_log, admin_comps writes, user_notes, user_flags, subscription_events, saved_segments, referral/discount codes, canned_responses, compound_versions, search_log/scan_misses/analytics_events insert scoping).`,
  },
  {
    area: 'gdpr-export-and-inspector',
    files: `admin-export/index.ts. Verify: minRole 'admin'+, audited (export_user/view_as_user), returns ONLY the requested user's data (no cross-user leak), uuid-validated, no secrets. The "state" inspector returns a user's synced bp.* — confirm that's intended + gated + logged.`,
  },
  {
    area: 'analytics-injection-and-bounds',
    files: `admin-analytics/index.ts, admin-cost/index.ts. Verify: any user-influenced value used in a query is safe; large scans are bounded; no per-user PII leaked beyond what a founder tool should show; reads only.`,
  },
  {
    area: 'flags-role-enforcement',
    files: `admin-flags/index.ts. Verify PER-ACTION role enforcement: adminsAdd/adminsRemove require OWNER; set/delete/consentPublish require ADMIN; reads readonly. A 'support' or 'readonly' admin must NOT be able to add an admin, flip a kill switch, or change a flag. Confirm kill-switch sets are audited.`,
  },
  {
    area: 'mutation-gating-sweep',
    files: `admin-delete-user, admin-leads, admin-invite-leads, admin-announcements, admin-compounds, admin-send-push, admin-tickets, admin-notes, admin-growth. For EACH: requireAdmin first? correct minRole? audit on mutations? no secret leak? input validation? Flag any that mutate before/without the gate or under-gate a destructive action.`,
  },
  {
    area: 'reads-and-public-surface',
    files: `admin-users, admin-overview, admin-subscriptions, admin-audit, admin-safety + the PUBLIC lead-capture/index.ts + the AI functions' kill switches (coach, analyze-plate, analyze-physique, explain-ingredient). Verify reads are gated readonly+, lead-capture is correctly rate-limited + can't be used to enumerate/abuse, and kill switches fail safe.`,
  },
]

log(`Security audit across ${AREAS.length} areas…`)
const results = await parallel(
  AREAS.map((a) => () =>
    agent(`${PRE}\n\n=== YOUR AREA: ${a.area} ===\nFiles (under ${H}/supabase/functions/ unless a path is given): ${a.files}`, {
      label: `sec:${a.area}`,
      phase: 'Security audit',
      schema: FINDING,
    }),
  ),
)
return results.filter(Boolean)
