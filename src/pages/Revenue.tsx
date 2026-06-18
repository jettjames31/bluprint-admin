// REVENUE — subscription metrics sourced from RevenueCat via the admin-revenue
// function. When the RevenueCat key isn't wired up yet the function reports
// `configured: false` with a `note`, and we render an explainer instead of
// metrics (see CHROME-PROMPTS.md for the connect step).
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { revenueApi, ApiCallError } from '@/lib/api'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner } from '@/components/ui'
import { fmtDate, fmtMoney, fmtNum, fmtPct } from '@/lib/format'
import { useLarp } from '@/lib/larp'
import { larpRevenue } from '@/lib/larpData'

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub != null && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function Revenue() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['revenue'],
    queryFn: () => revenueApi.metrics(),
  })

  const { larp, seed } = useLarp()
  const view = data && larp ? larpRevenue(data, seed) : data
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const PERIOD_LABEL = { week: 'This week', month: 'This month', year: 'This year' } as const

  return (
    <Page>
      <PageHeader
        title="Revenue"
        subtitle="Subscription metrics from RevenueCat"
        actions={
          <button className="btn" onClick={() => refetch()}>
            Refresh
          </button>
        }
      />

      {/* Booked revenue by period — from the webhook feed, so it works with or
          without RevenueCat. Dropdown picks the headline window. */}
      {view && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="row between" style={{ alignItems: 'center' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Revenue</div>
            <select
              className="select"
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'year')}
              style={{ width: 'auto' }}
            >
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
            </select>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="tabnum" style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.1 }}>
              {fmtMoney(view.periodRevenue?.[period])}
            </div>
            <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
              {PERIOD_LABEL[period]} · booked revenue (purchases + renewals − refunds)
            </div>
          </div>
          <div className="grid grid-3" style={{ marginTop: 16 }}>
            <Stat label="Week" value={fmtMoney(view.periodRevenue?.week)} />
            <Stat label="Month" value={fmtMoney(view.periodRevenue?.month)} />
            <Stat label="Year" value={fmtMoney(view.periodRevenue?.year)} />
          </div>
        </div>
      )}

      {isLoading && <Loading label="Loading revenue…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {/* Subscription activity — sourced from the local webhook feed, so it renders
          with or without the RevenueCat key (revenue $ chart below needs the key). */}
      {view && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">Subscription activity · last 30 days</div>
          {(view.activitySeries ?? []).some((d) => d.new || d.renewal || d.churn) ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={view.activitySeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => fmtDate(d)}
                  tick={{ fill: 'var(--text-faint)', fontSize: 12 }}
                  stroke="var(--border)"
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--text-faint)', fontSize: 12 }}
                  stroke="var(--border)"
                  width={32}
                />
                <Tooltip
                  labelFormatter={(d) => fmtDate(String(d))}
                  contentStyle={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 10,
                    color: 'var(--text)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="new" name="New" stroke="var(--green)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="renewal" name="Renewals" stroke="var(--blue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="churn" name="Churn" stroke="var(--red)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState>
              No subscription events yet — this fills in from the RevenueCat webhook as purchases, renewals, and
              cancellations come in.
            </EmptyState>
          )}
        </div>
      )}

      {view && !view.configured && (
        <div className="card">
          <div className="card-title">RevenueCat not connected</div>
          <EmptyState>
            Revenue metrics light up once the RevenueCat API key is wired into the{' '}
            <span className="mono">admin-revenue</span> function. Until then there's nothing to report here.
          </EmptyState>
          {view.note && (
            <p className="muted" style={{ marginTop: 4, fontSize: 13, lineHeight: 1.6 }}>
              {view.note}
            </p>
          )}
          <p className="faint" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.6 }}>
            See <span className="mono">CHROME-PROMPTS.md</span> for the step-by-step on connecting RevenueCat.
          </p>
        </div>
      )}

      {view && view.configured && (
        <>
          <div className="grid grid-4">
            <Stat label="Total subscribers" value={fmtNum(view.totalSubscribers)} />
            <Stat label="Active" value={fmtNum(view.activeSubscribers)} />
            <Stat label="MRR" value={fmtMoney(view.mrr)} sub="Monthly recurring" />
            <Stat label="ARR" value={fmtMoney(view.arr)} sub="Annual recurring" />
          </div>

          <div className="grid grid-3" style={{ marginTop: 14 }}>
            <Stat
              label="Free vs Paid"
              value={
                <span>
                  {fmtNum(view.freeCount)} <span className="faint">/</span> {fmtNum(view.paidCount)}
                </span>
              }
              sub="free / paid"
            />
            <Stat label="Trials" value={fmtNum(view.trials)} />
            <Stat label="Churn" value={fmtPct(view.churnRate)} />
            <Stat label="New this week" value={fmtNum(view.newThisWeek)} />
            <Stat label="New this month" value={fmtNum(view.newThisMonth)} />
          </div>

          {view.revenueSeries.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-title">Revenue over time</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={view.revenueSeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => fmtDate(d)}
                    tick={{ fill: 'var(--text-faint)', fontSize: 12 }}
                    stroke="var(--border)"
                  />
                  <YAxis
                    tickFormatter={(v: number) => fmtMoney(v)}
                    tick={{ fill: 'var(--text-faint)', fontSize: 12 }}
                    stroke="var(--border)"
                    width={64}
                  />
                  <Tooltip
                    labelFormatter={(d) => fmtDate(String(d))}
                    formatter={(v: number) => [fmtMoney(v), 'Revenue']}
                    contentStyle={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 10,
                      color: 'var(--text)',
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--text)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </Page>
  )
}
