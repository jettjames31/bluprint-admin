// ============================================================
// Dev-only sample data for VITE_PREVIEW mode.
//
// Returned by api.ts's call() when preview mode is on, so the whole dashboard
// renders populated (tables, charts, badges) WITHOUT a backend. This module is
// dynamically imported only under the preview guard, so it is NOT included in
// the production bundle. None of this is real data.
// ============================================================
import type {
  AdminUser,
  Announcement,
  Compound,
  Lead,
  Ticket,
} from '@/types'

const now = Date.now()
const ago = (days: number) => new Date(now - days * 86400000).toISOString()

const NAMES = [
  ['Maya Chen', 'maya@example.com', 'Build muscle', 'Intermediate', 'monthly'],
  ['Derek Olsen', 'derek.olsen@example.com', 'Lose fat', 'Beginner', 'free'],
  ['Priya Nair', 'priya@example.com', 'Longevity', 'Advanced', 'annual'],
  ['Sam Whitfield', 'sam.w@example.com', 'Recovery', 'Intermediate', 'trial'],
  ['Jordan Lee', 'jordanlee@example.com', 'Build muscle', 'Beginner', 'free'],
  ['Ana Sousa', 'ana.sousa@example.com', 'Body recomposition', 'Advanced', 'monthly'],
  ['Tom Becker', 'tbecker@example.com', 'Sleep & recovery', 'Intermediate', 'free'],
  ['Wei Zhang', 'wei.zhang@example.com', 'Longevity', 'Advanced', 'annual'],
]

const users: AdminUser[] = NAMES.map((n, i) => {
  const paid = n[4] !== 'free'
  return {
    id: `00000000-0000-4000-8000-${String(100000000000 + i).slice(-12)}`,
    email: n[1],
    phone: null,
    provider: i % 3 === 0 ? 'google' : 'email',
    createdAt: ago(60 - i * 6),
    lastSignInAt: ago(i % 5),
    lastActiveAt: ago(i % 7),
    profile: {
      name: n[0],
      goalLabel: n[2],
      experience: n[3],
      gender: i % 2 ? 'female' : 'male',
      healthFlags: i % 4 === 0 ? ['hypertension'] : [],
      physician: i % 3 === 0 ? 'Has physician' : 'None',
      onboarded: true,
    },
    entitlement: paid
      ? {
          user_id: '',
          entitlement: 'premium',
          active: true,
          expires_at: n[4] === 'trial' ? ago(-7) : null,
          product_id: n[4] === 'annual' ? 'annual_2999' : 'monthly_499',
          source: 'revenuecat',
          updated_at: ago(i),
        }
      : null,
    plan: (paid ? n[4] : 'free') as AdminUser['plan'],
  }
})

const leads: Lead[] = [
  { id: 'l1', name: 'Olivia Park', email: 'olivia@example.com', source: 'landing', status: 'waitlist', notes: 'Found us via TikTok', instagram_handle: null, type: 'waitlist', created_at: ago(2), invited_at: null, converted_at: null },
  { id: 'l2', name: 'Marcus Reed', email: 'marcus@example.com', source: 'landing', status: 'invited', notes: null, instagram_handle: null, type: 'waitlist', created_at: ago(5), invited_at: ago(1), converted_at: null },
  { id: 'l3', name: 'Lena Fox', email: 'lena@example.com', source: 'referral', status: 'converted', notes: 'Referred by Maya', instagram_handle: null, type: 'waitlist', created_at: ago(12), invited_at: ago(9), converted_at: ago(7) },
  { id: 'l4', name: 'Kai Moreau', email: 'kai@example.com', source: 'instagram', status: 'applied', notes: 'Fitness creator, 40k followers', instagram_handle: '@kaibuilds', type: 'tester', created_at: ago(3), invited_at: null, converted_at: null },
  { id: 'l5', name: 'Riya Shah', email: 'riya@example.com', source: 'instagram', status: 'active', notes: 'Great feedback on the coach', instagram_handle: '@riya.lifts', type: 'tester', created_at: ago(20), invited_at: ago(18), converted_at: null },
]

const announcements: Announcement[] = [
  { id: 'a1', title: 'New: AI plate scanner', body: 'Snap a photo of your meal and get an instant macro breakdown. Premium members get unlimited scans.', segment: 'all', active: true, starts_at: ago(2), ends_at: ago(-12), created_at: ago(2), created_by: null },
  { id: 'a2', title: 'Premium price update', body: 'Annual is now $29.99 — lock in the current rate before it changes.', segment: 'free', active: true, starts_at: null, ends_at: null, created_at: ago(6), created_by: null },
  { id: 'a3', title: 'Holiday recovery challenge', body: 'A 14-day streak challenge kicks off Monday.', segment: 'premium', active: false, starts_at: ago(30), ends_at: ago(16), created_at: ago(31), created_by: null },
]

const compounds: Compound[] = [
  { id: 'cjc-1295', name: 'CJC-1295', primaryCategory: 'Muscle Growth', researchStatusBadge: 'Early Clinical', oneLiner: 'Long-acting GHRH analogue that lifts the GH/IGF-1 baseline', legalStatus: 'Research compound. Not FDA-approved.', hidden: false },
  { id: 'ipamorelin', name: 'Ipamorelin', primaryCategory: 'Muscle Growth', researchStatusBadge: 'Preclinical', oneLiner: 'The cleanest GHRP — a selective GH pulse with few side effects', legalStatus: 'Research compound.', hidden: false },
  { id: 'bpc-157', name: 'BPC-157', primaryCategory: 'Recovery', researchStatusBadge: 'Preclinical', oneLiner: 'A gastric peptide studied for tendon and gut repair', legalStatus: 'Research compound.', hidden: false },
  { id: 'tesamorelin', name: 'Tesamorelin', primaryCategory: 'Fat Loss', researchStatusBadge: 'FDA Approved', oneLiner: 'GHRH analogue approved for visceral fat reduction', legalStatus: 'FDA-approved (Egrifta).', hidden: false },
  { id: 'tb-500', name: 'TB-500', primaryCategory: 'Recovery', researchStatusBadge: 'Dev Abandoned', oneLiner: 'Synthetic thymosin β4 fragment studied for healing', legalStatus: 'Research compound.', hidden: true },
]

const tickets: Ticket[] = [
  { id: 't1', user_id: users[1].id, subject: 'Can’t restore my purchase', body: 'I subscribed on my old phone and premium isn’t showing on my new one.', status: 'open', priority: 'urgent', created_at: ago(1), updated_at: ago(0), email: users[1].email, messageCount: 2 },
  { id: 't2', user_id: users[4].id, subject: 'Feature request: export weight log', body: 'Would love a CSV export of my weight history.', status: 'in_progress', priority: 'normal', created_at: ago(4), updated_at: ago(2), email: users[4].email, messageCount: 3 },
  { id: 't3', user_id: users[6].id, subject: 'Coach gave odd advice', body: 'The AI suggested something that didn’t match my goal.', status: 'resolved', priority: 'normal', created_at: ago(9), updated_at: ago(8), email: users[6].email, messageCount: 4 },
]

const revenueSeries = Array.from({ length: 12 }, (_, i) => ({
  date: ago((11 - i) * 30),
  value: Math.round(1800 + i * 240 + Math.sin(i) * 180),
}))

/** Return canned sample data for a given function + action. */
export function previewResponse(fn: string, body: { action?: string; id?: string } = {}): unknown {
  const action = body.action
  switch (fn) {
    case 'admin-flags':
      if (action === 'whoami') return { isAdmin: true, role: 'founder', email: 'you@bluprint.health' }
      if (action === 'list')
        return {
          flags: [
            { key: 'free_daily_limit', value: 5, description: 'Free-tier AI coach queries per day.', updated_at: ago(3), updated_by: null },
            { key: 'free_plate_limit', value: 2, description: 'Free-tier AI plate scans per day.', updated_at: ago(3), updated_by: null },
            { key: 'ai_query_logging', value: false, description: 'PRIVACY: store users’ AI Q&A. OFF by default.', updated_at: ago(3), updated_by: null },
            { key: 'announcements_enabled', value: true, description: 'Master switch for in-app announcements.', updated_at: ago(3), updated_by: null },
          ],
        }
      if (action === 'consentList')
        return { versions: [
          { id: 'c1', kind: 'ai', version: 2, body: 'AI consent copy v2…', active: true, created_at: ago(10), created_by: null },
          { id: 'c0', kind: 'ai', version: 1, body: 'AI consent copy v1…', active: false, created_at: ago(40), created_by: null },
        ] }
      if (action === 'adminsList')
        return { admins: [
          { user_id: 'f1', email: 'founder1@bluprint.health', role: 'founder', added_by: null, added_at: ago(45) },
          { user_id: 'f2', email: 'founder2@bluprint.health', role: 'founder', added_by: null, added_at: ago(45) },
          { user_id: 'f3', email: 'founder3@bluprint.health', role: 'founder', added_by: null, added_at: ago(30) },
        ] }
      return { ok: true }

    case 'admin-users':
      if (action === 'get') return { user: users[0] }
      if (action === 'aiUsage')
        return {
          today: 312,
          week: 1840,
          month: 6920,
          byUser: users.slice(0, 6).map((u, i) => ({ user_id: u.id, count: 84 - i * 11, email: u.email })),
          highUsage: [{ user_id: users[0].id, count: 63, email: users[0].email }],
        }
      return { users, total: users.length }

    case 'admin-revenue':
      return {
        configured: true,
        totalSubscribers: 1284,
        activeSubscribers: 1102,
        trials: 96,
        mrr: 8430,
        arr: 101160,
        freeCount: 4120,
        paidCount: 1102,
        churnRate: 0.038,
        newThisWeek: 47,
        newThisMonth: 213,
        revenueSeries,
      }

    case 'admin-health':
      if (action === 'errors')
        return { errors: [
          { id: 'e1', fn: 'coach', kind: 'ai_failure', message: 'anthropic 529: overloaded', user_id: users[2].id, created_at: ago(0) },
          { id: 'e2', fn: 'analyze-plate', kind: 'upstream', message: 'timeout after 30s', user_id: users[5].id, created_at: ago(1) },
        ] }
      return {
        supabase: { ok: true, latencyMs: 38 },
        revenuecatWebhook: { lastEventAt: ago(0), ok: true },
        activeUsers: { last24h: 286, last7d: 1043 },
        errors24h: 2,
        checkedAt: new Date(now).toISOString(),
      }

    case 'admin-leads':
      return { leads: body && (body as { type?: string }).type === 'tester' ? leads.filter((l) => l.type === 'tester') : leads.filter((l) => l.type === 'waitlist') }

    case 'admin-announcements':
      return { announcements }

    case 'admin-send-push':
      if (action === 'history')
        return { log: [
          { id: 'p1', title: 'Streak reminder', body: 'Don’t break your streak — log today!', segment: 'all', target_user_id: null, sent_count: 1043, ok_count: 1020, error_count: 23, created_at: ago(1), created_by: null },
          { id: 'p2', title: 'New compound added', body: 'Check out the latest in the library.', segment: 'premium', target_user_id: null, sent_count: 1102, ok_count: 1099, error_count: 3, created_at: ago(5), created_by: null },
        ] }
      return { sent: 1043, ok: 1020, errors: 23 }

    case 'admin-compounds':
      return { compounds, source: 'server' }

    case 'admin-ai-queries':
      return { enabled: true, queries: [
        { id: 'q1', user_id: users[0].id, mode: 'coach', question: 'What’s a good beginner peptide stack for recovery?', response: 'For recovery-focused goals, the most-studied options are…', created_at: ago(0) },
        { id: 'q2', user_id: users[3].id, mode: 'coach', question: 'How much protein should I eat to build muscle?', response: 'A common evidence-based target is 1.6–2.2g/kg…', created_at: ago(0) },
      ] }

    case 'admin-tickets':
      if (action === 'get')
        return {
          ticket: tickets[0],
          messages: [
            { id: 'm1', ticket_id: 't1', author: 'user', author_id: users[1].id, body: tickets[0].body, internal: false, created_at: ago(1) },
            { id: 'm2', ticket_id: 't1', author: 'admin', author_id: null, body: 'Thanks — can you try Settings → Restore purchases and let me know?', internal: false, created_at: ago(0) },
            { id: 'm3', ticket_id: 't1', author: 'admin', author_id: null, body: '(internal) checked RC dashboard — entitlement is active, likely a logIn alias issue.', internal: true, created_at: ago(0) },
          ],
        }
      return { tickets, openCount: tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length }

    default:
      return { ok: true }
  }
}
