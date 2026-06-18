// LARP MODE data — impressive numbers that overlay the real ones when LARP is
// on. Driven by a per-login `seed` (see lib/larp) so the figures are DIFFERENT
// every time you log in, but stable within a session (no flicker across renders
// or page navigations). All pages derive from one shared baseline for a given
// seed, so Overview/Revenue/Analytics/Cost agree with each other.
import type { OverviewKpis, RevenueMetrics, AnalyticsSummary, CostSummary } from '@/types'

// mulberry32 — tiny deterministic PRNG. Same seed → same sequence.
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const DAY_MS = 86_400_000
function dayKey(daysAgo: number) {
  return new Date(Date.now() - daysAgo * DAY_MS).toISOString().slice(0, 10)
}
const r2 = (n: number) => Math.round(n * 100) / 100

// Ascending hockey-stick series of n points ending near `end`.
function ramp(n: number, end: number, seed: number): number[] {
  const r = rng(seed)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1)
    const base = end * Math.pow(t, 1.8)
    out.push(Math.max(0, Math.round(base + base * (r() - 0.5) * 0.14)))
  }
  out[n - 1] = end
  return out
}

// The core figures, derived once per seed. Every generator reads from this so
// the whole dashboard tells one (gloriously fake) consistent story per login.
function baseline(seed: number) {
  const r = rng(seed)
  const int = (min: number, max: number) => min + Math.floor(r() * (max - min + 1))
  const users = int(28_000, 72_000)
  const mau = Math.round(users * (0.82 + r() * 0.12))
  const wau = Math.round(mau * (0.64 + r() * 0.1))
  const dau = Math.round(wau * (0.52 + r() * 0.1))
  const premium = Math.round(users * (0.18 + r() * 0.1))
  const trials = Math.round(premium * (0.08 + r() * 0.06))
  const comped = int(120, 600)
  const newThisWeek = int(800, 2600)
  const newThisMonth = Math.round(newThisWeek * (3.4 + r() * 1.2))
  const mrr = Math.round(premium * (9 + r() * 8))
  const churn = r2(0.008 + r() * 0.03)
  const aiQueriesToday = int(12_000, 42_000)
  const aiCostToday = r2(8 + r() * 30)
  const cacheHit = r2(0.62 + r() * 0.3)
  return { users, mau, wau, dau, premium, trials, comped, newThisWeek, newThisMonth, mrr, churn, aiQueriesToday, aiCostToday, cacheHit }
}

export function larpOverview(base: OverviewKpis, seed: number): OverviewKpis {
  const b = baseline(seed)
  return {
    ...base,
    users: b.users,
    premium: b.premium,
    comped: b.comped,
    newSubsWeek: b.newThisWeek,
    dau: b.dau,
    wau: b.wau,
    mau: b.mau,
    dauMauRatio: r2(b.dau / b.mau),
    openTickets: 0,
    errors24h: 0,
    aiQueriesToday: b.aiQueriesToday,
    aiCostToday: b.aiCostToday,
  }
}

export function larpRevenue(base: RevenueMetrics, seed: number): RevenueMetrics {
  const b = baseline(seed)
  const DAYS = 30
  const revenueSeries = ramp(DAYS, Math.round(b.mrr / 28), seed + 11).map((value, i) => ({
    date: dayKey(DAYS - 1 - i),
    value,
  }))
  const activitySeries = Array.from({ length: DAYS }, (_, i) => {
    const r = rng(seed + 200 + i)
    const created = Math.max(5, Math.round((b.newThisWeek / 7) * (0.5 + r() * 1.2) + i * 0.8))
    return {
      date: dayKey(DAYS - 1 - i),
      new: created,
      renewal: Math.round(created * (1.3 + r() * 0.7)),
      churn: Math.round(r() * 8),
    }
  })
  return {
    ...base,
    configured: true,
    note: undefined,
    totalSubscribers: b.premium + b.trials,
    activeSubscribers: b.premium,
    trials: b.trials,
    mrr: b.mrr,
    arr: b.mrr * 12,
    freeCount: b.users - b.premium,
    paidCount: b.premium,
    churnRate: b.churn,
    newThisWeek: b.newThisWeek,
    newThisMonth: b.newThisMonth,
    revenueSeries,
    activitySeries,
    periodRevenue: {
      week: Math.round(b.mrr / 4),
      month: Math.round(b.mrr * 1.05),
      year: Math.round(b.mrr * 8),
    },
  }
}

export function larpAnalytics(base: AnalyticsSummary, seed: number): AnalyticsSummary {
  const b = baseline(seed)
  const r = rng(seed + 300)
  const jit = () => 0.9 + r() * 0.2
  const dist = (pairs: [string, number][]) => pairs.map(([label, w]) => ({ label, count: Math.round(b.users * w * jit()) }))
  const cnt = (min: number, max: number) => min + Math.floor(r() * (max - min))
  return {
    ...base,
    dau: b.dau,
    wau: b.wau,
    mau: b.mau,
    dauMauRatio: r2(b.dau / b.mau),
    healthFlagRate: r2(0.15 + r() * 0.18),
    physicianRate: r2(0.22 + r() * 0.16),
    goals: dist([['Fat loss', 0.36], ['Muscle gain', 0.3], ['Longevity', 0.2], ['Recovery', 0.14]]),
    experience: dist([['Beginner', 0.44], ['Intermediate', 0.38], ['Advanced', 0.18]]),
    genders: dist([['Male', 0.64], ['Female', 0.33], ['Unspecified', 0.03]]),
    topBookmarked: [
      { id: 'bpc-157', count: cnt(6000, 9000) },
      { id: 'tb-500', count: cnt(4500, 6500) },
      { id: 'retatrutide', count: cnt(4000, 6000) },
      { id: 'tesamorelin', count: cnt(2800, 4500) },
      { id: 'ipamorelin', count: cnt(2200, 3800) },
    ],
    topSearched: [
      { query: 'bpc-157 dosage', count: cnt(3800, 5500) },
      { query: 'retatrutide vs tirzepatide', count: cnt(3000, 4500) },
      { query: 'tb-500 healing', count: cnt(2400, 3600) },
      { query: 'glow protocol', count: cnt(1800, 3000) },
    ],
    emptySearches: [
      { query: 'slu-pp-332', count: cnt(400, 800) },
      { query: 'nad+ nasal spray', count: cnt(250, 600) },
    ],
    scanMisses: [
      { value: '850006659012', count: cnt(50, 140) },
      { value: 'unlabeled vial', count: cnt(30, 90) },
    ],
    trending: [
      { query: 'retatrutide', count: cnt(4500, 6500), prev: cnt(1500, 2600) },
      { query: 'mots-c', count: cnt(1800, 2800), prev: cnt(700, 1200) },
      { query: 'glow stack', count: cnt(1400, 2200), prev: cnt(900, 1500) },
    ],
    stackGraph: [
      { a: 'BPC-157', b: 'TB-500', count: cnt(3200, 5000) },
      { a: 'Ipamorelin', b: 'CJC-1295', count: cnt(2200, 3600) },
      { a: 'Retatrutide', b: 'L-Carnitine', count: cnt(1200, 2400) },
    ],
    highRiskWatch: [],
    funnel: [
      { step: 'Onboarding start', count: b.users },
      { step: 'Profile complete', count: Math.round(b.users * (0.88 + r() * 0.06)) },
      { step: 'First protocol', count: Math.round(b.users * (0.72 + r() * 0.08)) },
      { step: 'First coach query', count: Math.round(b.users * (0.56 + r() * 0.08)) },
      { step: 'Subscribed', count: b.premium },
    ],
  }
}

export interface LarpPortfolioApp {
  id: string
  name: string
  short: string
  color: string
  users: number
  premium: number
  dau: number
  newSubsWeek: number
}

// The fake multi-app empire for the Portfolio page in LARP mode — the registered
// real apps (with fabricated KPIs) plus a few imaginary hits for the flex.
export function larpPortfolio(
  seed: number,
  real: { id: string; name: string; short: string; color: string }[],
): LarpPortfolioApp[] {
  const extras = [
    { id: 'larp-pt', name: 'Peptide Tycoon', short: 'PT', color: 'var(--green)' },
    { id: 'larp-mm', name: 'Macro Mage', short: 'MM', color: 'var(--blue)' },
    { id: 'larp-rq', name: 'Recovery Quest', short: 'RQ', color: 'var(--amber)' },
  ]
  return [...real, ...extras].map((a, i) => {
    const b = baseline(seed + i * 97 + 13)
    return { id: a.id, name: a.name, short: a.short, color: a.color, users: b.users, premium: b.premium, dau: b.dau, newSubsWeek: b.newThisWeek }
  })
}

export function larpCost(base: CostSummary, seed: number): CostSummary {
  const b = baseline(seed)
  const DAYS = 30
  const byDay = ramp(DAYS, Math.max(6, Math.round(b.aiCostToday)), seed + 400).map((v, i) => ({
    date: dayKey(DAYS - 1 - i),
    cost: r2(v * 0.85 + 1.5),
  }))
  const month = r2(byDay.reduce((s, d) => s + d.cost, 0))
  return {
    ...base,
    enabled: true,
    note: undefined,
    today: b.aiCostToday,
    month,
    projected30d: r2(month * 1.15),
    cacheHitRate: b.cacheHit,
    byDay,
    byModel: [
      { model: 'claude-haiku-4-5', cost: r2(month * 0.62), count: Math.round(b.aiQueriesToday * 6.4) },
      { model: 'claude-sonnet-4-6', cost: r2(month * 0.31), count: Math.round(b.aiQueriesToday * 0.85) },
      { model: 'claude-opus-4-8', cost: r2(month * 0.07), count: Math.round(b.aiQueriesToday * 0.06) },
    ],
    byUser: [
      { user_id: 'u_8f21d6', email: 'whale@demo.app', cost: r2(3 + (seed % 7) * 0.4) },
      { user_id: 'u_2b0944', email: 'poweruser@demo.app', cost: r2(2.4 + (seed % 5) * 0.3) },
      { user_id: 'u_5c7710', email: 'earlyadopter@demo.app', cost: r2(1.8 + (seed % 4) * 0.3) },
    ],
  }
}
