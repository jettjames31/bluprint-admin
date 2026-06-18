// LARP MODE data — deterministic, impressive numbers that overlay the real ones
// when LARP is on. Seeded so they're stable across renders (no flicker). Each
// generator takes the real value and returns a fully-populated copy, so we never
// drop a field the page expects.
import type { OverviewKpis, RevenueMetrics } from '@/types'

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
