// REVENUE — subscription metrics sourced from RevenueCat via the admin-revenue
// function. When the RevenueCat key isn't wired up yet the function reports
// `configured: false` with a `note`, and we render an explainer instead of
// metrics (see CHROME-PROMPTS.md for the connect step).
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { revenueApi, ApiCallError } from '@/lib/api'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner } from '@/components/ui'
import { fmtDate, fmtMoney, fmtNum, fmtPct } from '@/lib/format'

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

      {isLoading && <Loading label="Loading revenue…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {/* Subscription activity — sourced from the local webhook feed, so it renders
          with or without the RevenueCat key (revenue $ chart below needs the key). */}
      {data && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title">Subscription activity · last 30 days</div>
          {(data.activitySeries ?? []).some((d) => d.new || d.renewal || d.churn) ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.activitySeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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

      {data && !data.configured && (
        <div className="card">
          <div className="card-title">RevenueCat not connected</div>
          <EmptyState>
            Revenue metrics light up once the RevenueCat API key is wired into the{' '}
            <span className="mono">admin-revenue</span> function. Until then there's nothing to report here.
          </EmptyState>
          {data.note && (
            <p className="muted" style={{ marginTop: 4, fontSize: 13, lineHeight: 1.6 }}>
              {data.note}
            </p>
          )}
          <p className="faint" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.6 }}>
            See <span className="mono">CHROME-PROMPTS.md</span> for the step-by-step on connecting RevenueCat.
          </p>
        </div>
      )}

      {data && data.configured && (
        <>
          <div className="grid grid-4">
            <Stat label="Total subscribers" value={fmtNum(data.totalSubscribers)} />
            <Stat label="Active" value={fmtNum(data.activeSubscribers)} />
            <Stat label="MRR" value={fmtMoney(data.mrr)} sub="Monthly recurring" />
            <Stat label="ARR" value={fmtMoney(data.arr)} sub="Annual recurring" />
          </div>

          <div className="grid grid-3" style={{ marginTop: 14 }}>
            <Stat
              label="Free vs Paid"
              value={
                <span>
                  {fmtNum(data.freeCount)} <span className="faint">/</span> {fmtNum(data.paidCount)}
                </span>
              }
              sub="free / paid"
            />
            <Stat label="Trials" value={fmtNum(data.trials)} />
            <Stat label="Churn" value={fmtPct(data.churnRate)} />
            <Stat label="New this week" value={fmtNum(data.newThisWeek)} />
            <Stat label="New this month" value={fmtNum(data.newThisMonth)} />
          </div>

          {data.revenueSeries.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-title">Revenue over time</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data.revenueSeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
