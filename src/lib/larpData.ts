// LARP MODE data — deterministic, impressive numbers that overlay the real ones
// when LARP is on. Seeded so they're stable across renders (no flicker). Each
// generator takes the real value and returns a fully-populated copy, so we never
// drop a field the page expects.
import type { OverviewKpis, RevenueMetrics, AnalyticsSummary, CostSummary } from '@/types'

// mulberry32 — tiny deterministic PRNG so the fake numbers don't jump per render.
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY_MS = 86_400_000
function dayKey(daysAgo: number) {
  return new Date(Date.now() - daysAgo * DAY_MS).toISOString().slice(0, 10)
}

// Ascending hockey-stick series of n points ending exactly at `end`.
function ramp(n: number, end: number, seed: number): number[] {
  const r = rng(seed)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1)
    const base = end * Math.pow(t, 1.8)
    out.push(Math.max(0, Math.round(base + base * (r() - 0.5) * 0.12)))
  }
  out[n - 1] = end
  return out
}

export function larpOverview(base: OverviewKpis): OverviewKpis {
  return {
    ...base,
    users: 48213,
    premium: 11904,
    comped: 312,
    newSubsWeek: 1487,
    dau: 19320,
    wau: 33102,
    mau: 45980,
    dauMauRatio: 0.42,
    openTickets: 0,
    errors24h: 0,
    aiQueriesToday: 28744,
    aiCostToday: 18.92,
  }
}

export function larpRevenue(base: RevenueMetrics): RevenueMetrics {
  const DAYS = 30
  const revenueSeries = ramp(DAYS, 92_000, 7).map((value, i) => ({ date: dayKey(DAYS - 1 - i), value }))
  const activitySeries = Array.from({ length: DAYS }, (_, i) => {
    const r = rng(101 + i)
    const created = 28 + Math.round(r() * 70 + i * 3.2) // climbing new subs
    return {
      date: dayKey(DAYS - 1 - i),
      new: created,
      renewal: Math.round(created * (1.4 + r() * 0.6)),
      churn: Math.round(r() * 7),
    }
  })
  return {
    ...base,
    configured: true,
    note: undefined,
    totalSubscribers: 12216,
    activeSubscribers: 11904,
    trials: 1342,
    mrr: 91870,
    arr: 1102440,
    freeCount: 36309,
    paidCount: 11904,
    churnRate: 0.018,
    newThisWeek: 1487,
    newThisMonth: 5921,
    revenueSeries,
    activitySeries,
  }
}

export function larpAnalytics(base: AnalyticsSummary): AnalyticsSummary {
  const dist = (pairs: [string, number][]) => pairs.map(([label, count]) => ({ label, count }))
  return {
    ...base,
    dau: 19320,
    wau: 33102,
    mau: 45980,
    dauMauRatio: 0.42,
    healthFlagRate: 0.23,
    physicianRate: 0.31,
    goals: dist([['Fat loss', 18204], ['Muscle gain', 14920], ['Longevity', 8331], ['Recovery', 4525]]),
    experience: dist([['Beginner', 21030], ['Intermediate', 18440], ['Advanced', 8743]]),
    genders: dist([['Male', 31200], ['Female', 15980], ['Unspecified', 1033]]),
    topBookmarked: [
      { id: 'bpc-157', count: 8421 },
      { id: 'tb-500', count: 6210 },
      { id: 'retatrutide', count: 5908 },
      { id: 'tesamorelin', count: 4133 },
      { id: 'ipamorelin', count: 3640 },
    ],
    topSearched: [
      { query: 'bpc-157 dosage', count: 5120 },
      { query: 'retatrutide vs tirzepatide', count: 4012 },
      { query: 'tb-500 healing', count: 3344 },
      { query: 'glow protocol', count: 2890 },
    ],
    emptySearches: [
      { query: 'slu-pp-332', count: 612 },
      { query: 'nad+ nasal spray', count: 410 },
    ],
    scanMisses: [
      { value: '850006659012', count: 88 },
      { value: 'unlabeled vial', count: 51 },
    ],
    trending: [
      { query: 'retatrutide', count: 5908, prev: 2110 },
      { query: 'mots-c', count: 2204, prev: 980 },
      { query: 'glow stack', count: 1890, prev: 1400 },
    ],
    stackGraph: [
      { a: 'BPC-157', b: 'TB-500', count: 4120 },
      { a: 'Ipamorelin', b: 'CJC-1295', count: 3010 },
      { a: 'Retatrutide', b: 'L-Carnitine', count: 1840 },
    ],
    highRiskWatch: [],
    funnel: [
      { step: 'Onboarding start', count: 48213 },
      { step: 'Profile complete', count: 44102 },
      { step: 'First protocol', count: 38740 },
      { step: 'First coach query', count: 31204 },
      { step: 'Subscribed', count: 11904 },
    ],
  }
}

export function larpCost(base: CostSummary): CostSummary {
  const DAYS = 30
  const byDay = ramp(DAYS, 24, 21).map((v, i) => ({
    date: dayKey(DAYS - 1 - i),
    cost: Math.round((v * 0.8 + 2) * 100) / 100,
  }))
  const month = Math.round(byDay.reduce((s, d) => s + d.cost, 0) * 100) / 100
  const r2 = (n: number) => Math.round(n * 100) / 100
  return {
    ...base,
    enabled: true,
    note: undefined,
    today: 18.92,
    month,
    projected30d: r2(month * 1.15),
    cacheHitRate: 0.78,
    byDay,
    byModel: [
      { model: 'claude-haiku-4-5', cost: r2(month * 0.62), count: 184320 },
      { model: 'claude-sonnet-4-6', cost: r2(month * 0.31), count: 24110 },
      { model: 'claude-opus-4-8', cost: r2(month * 0.07), count: 1840 },
    ],
    byUser: [
      { user_id: 'u_8f21d6', email: 'whale@demo.app', cost: 4.12 },
      { user_id: 'u_2b0944', email: 'poweruser@demo.app', cost: 3.4 },
      { user_id: 'u_5c7710', email: 'earlyadopter@demo.app', cost: 2.88 },
    ],
  }
}
