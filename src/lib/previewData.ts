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

    case 'admin-overview':
      return {
        users: 5404, premium: 1102, comped: 14, dau: 286, wau: 1043, mau: 3120,
        dauMauRatio: 0.092, newSubsWeek: 47, openTickets: 2, errors24h: 2,
        aiQueriesToday: 312, aiCostToday: 4.18, checkedAt: new Date(now).toISOString(),
      }

    case 'admin-analytics':
      return {
        dau: 286, wau: 1043, mau: 3120, dauMauRatio: 0.092,
        goals: [ { label: 'Build muscle', count: 1980 }, { label: 'Lose fat', count: 1420 }, { label: 'Longevity', count: 1100 }, { label: 'Recovery', count: 904 } ],
        experience: [ { label: 'Beginner', count: 2600 }, { label: 'Intermediate', count: 1980 }, { label: 'Advanced', count: 824 } ],
        genders: [ { label: 'male', count: 3960 }, { label: 'female', count: 1444 } ],
        healthFlagRate: 0.38, physicianRate: 0.21,
        topBookmarked: [ { id: 'bpc-157', count: 842 }, { id: 'cjc-1295', count: 610 }, { id: 'ipamorelin', count: 588 }, { id: 'tesamorelin', count: 401 } ],
        topSearched: [ { query: 'retatrutide', count: 320 }, { query: 'bpc 157', count: 280 }, { query: 'tb-500', count: 190 } ],
        emptySearches: [ { query: 'slu-pp-332', count: 41 }, { query: 'survodutide', count: 28 } ],
        scanMisses: [ { value: '850000123456', count: 12 }, { value: 'creatine gummies', count: 7 } ],
        trending: [ { query: 'retatrutide', count: 320, prev: 180 }, { query: 'slu-pp-332', count: 41, prev: 9 } ],
        stackGraph: [ { a: 'bpc-157', b: 'tb-500', count: 312 }, { a: 'cjc-1295', b: 'ipamorelin', count: 280 }, { a: 'bpc-157', b: 'cjc-1295', count: 96 } ],
        highRiskWatch: [ { user_id: users[6].id, email: users[6].email, flags: ['hypertension'], compounds: ['cjc-1295', 'ipamorelin'] } ],
        funnel: [ { step: 'app_open', count: 5404 }, { step: 'onboarding_complete', count: 3980 }, { step: 'compound_view', count: 3420 }, { step: 'protocol_add', count: 1880 }, { step: 'scan', count: 1120 }, { step: 'subscribe', count: 1102 } ],
        retention: { d1: 0.52, d7: 0.34, d30: 0.19 },
        featureAdoption: [ { feature: 'AI coach', pct: 0.61 }, { feature: 'Scans', pct: 0.38 }, { feature: 'Wearables', pct: 0.22 }, { feature: 'Protocol', pct: 0.55 } ],
        heatmap: [],
      }

    case 'admin-subscriptions': {
      const ev = (t: string, i: number, price: number | null) => ({ id: `se${i}`, user_id: users[i % users.length].id, email: users[i % users.length].email, type: t, product_id: 'monthly_499', store: 'APP_STORE', price, currency: 'USD', environment: 'PRODUCTION', event_at: ago(i) })
      return {
        configured: true,
        events: [ ev('INITIAL_PURCHASE', 0, 4.99), ev('RENEWAL', 1, 4.99), ev('CANCELLATION', 2, null), ev('BILLING_ISSUE', 3, null), ev('RENEWAL', 4, 4.99) ],
        refunds: [ ev('REFUND', 6, -4.99), ev('CANCELLATION', 8, null) ],
        atRisk: [ { user_id: users[3].id, email: users[3].email, reason: 'Trial ends in 31h', expires_at: ago(-1.3) }, { user_id: users[1].id, email: users[1].email, reason: 'Billing retry', expires_at: null } ],
        comped: [ { user_id: users[7].id, email: users[7].email, reason: 'IG tester comp', granted_by: 'f1', expires_at: null, created_at: ago(12) } ],
      }
    }

    case 'admin-audit': {
      const a = (i: number, action: string, tt: string, tid: string, reason: string | null) => ({ id: `au${i}`, actor_id: 'f1', actor_email: 'founder1@bluprint.health', action, target_type: tt, target_id: tid, reason, meta: {}, created_at: ago(i * 0.2) })
      return { entries: [
        a(0, 'grant_premium', 'user', users[7].id, 'IG tester comp'),
        a(1, 'send_push', 'segment', 'all', null),
        a(2, 'edit_compound', 'compound', 'bpc-157', null),
        a(3, 'delete_user', 'user', '00000000-0000-4000-8000-000000000099', 'GDPR request'),
        a(4, 'set_flag', 'flag', 'kill_coach', null),
        a(5, 'reply_ticket', 'ticket', 't1', null),
      ] }
    }

    case 'admin-safety':
      return {
        enabled: true,
        flagged: [
          { id: 'aq1', user_id: users[1].id, mode: 'coach', question: 'How many mg of BPC-157 should I inject daily?', response: 'I can’t give dosing guidance — that’s something to discuss with a qualified clinician…', created_at: ago(0) },
          { id: 'aq2', user_id: users[4].id, mode: 'coach', question: 'What dose of retatrutide for fat loss?', response: 'I’m not able to provide dosing. Here’s what the research describes generally…', created_at: ago(0) },
        ],
        dosingHotspots: [ { compound: 'bpc-157', count: 38 }, { compound: 'retatrutide', count: 22 }, { compound: 'tb-500', count: 14 } ],
        offLibraryMentions: [ { compound: 'slu-pp-332', count: 9 }, { compound: 'survodutide', count: 5 } ],
        adverse: [ { id: 'ae1', user_id: users[2].id, email: users[2].email, compound_id: 'cjc-1295', description: 'Persistent water retention + tingling in hands after 3 weeks.', severity: 'moderate', status: 'new', created_at: ago(1) } ],
        feedback: [ { id: 'fb1', user_id: users[5].id, email: users[5].email, body: 'Love the coach but wish it remembered my last protocol.', rating: 4, app_version: '1.0.3', created_at: ago(2) } ],
      }

    case 'admin-cost':
      return {
        enabled: true, today: 4.18, month: 86.4,
        byDay: Array.from({ length: 14 }, (_, i) => ({ date: ago(13 - i), cost: Math.round((3 + Math.sin(i) + i * 0.2) * 100) / 100 })),
        byModel: [ { model: 'claude-haiku-4-5', cost: 62.1, count: 18400 }, { model: 'claude-sonnet (vision)', cost: 24.3, count: 1200 } ],
        byUser: users.slice(0, 6).map((u, i) => ({ user_id: u.id, email: u.email, cost: Math.round((6 - i) * 1.4 * 100) / 100 })),
        cacheHitRate: 0.73, projected30d: 92.5,
      }

    case 'admin-growth':
      if (action === 'discountList') return { codes: [ { code: 'LAUNCH50', percent_off: 50, expires_at: ago(-30), max_redemptions: 100, redemptions: 23, active: true, created_at: ago(8) } ] }
      if (action === 'segmentList') return { segments: [ { id: 's1', name: 'Free who viewed Retatrutide', definition: { plan: 'free', viewedCompound: 'retatrutide', notSubscribed: true }, created_at: ago(5) } ] }
      if (action === 'cannedList') return { canned: [ { id: 'cr1', title: 'Restore purchase', body: 'Try Settings → Restore purchases…', created_at: ago(20) } ] }
      return { codes: [ { code: 'KAIBUILDS', owner_label: '@kaibuilds (IG)', uses: 142, conversions: 38, active: true, created_at: ago(15) } ] }

    case 'admin-notes':
      if (action === 'list')
        return {
          notes: [ { id: 'n1', user_id: (body as { userId?: string }).userId || users[0].id, author_id: 'f1', body: 'Reached out about restore-purchase issue; resolved.', created_at: ago(2) } ],
          flags: [ { id: 'uf1', user_id: (body as { userId?: string }).userId || users[0].id, flag: 'refund_requested', reason: 'Asked for refund via email', active: true, created_by: 'f1', created_at: ago(1) } ],
        }
      return { ok: true }

    case 'admin-export':
      if (action === 'state')
        return { state: { 'bp.profile.v1': users[0].profile, 'bp.bookmarks.v1': ['bpc-157', 'cjc-1295'], 'bp.streak.v1': { count: 12, best: 21, date: '2026-06-17' } } }
      return { export: { user: { email: users[0].email, created_at: users[0].createdAt }, profile: users[0].profile, entitlement: users[0].entitlement, notes: [], flags: [], tickets: [] } }

    default:
      return { ok: true }
  }
}
