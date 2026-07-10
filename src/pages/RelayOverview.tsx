// RELAY — the commercial desktop product's console (same Supabase project, relay_* tables,
// admin-relay-* functions). Overview: customer + entitlement KPIs, MRR/ARR + booked revenue,
// 30-day subscription activity, engagement (DAU/WAU/MAU), and the current subscribers table.
// Sources: admin-relay-overview + admin-relay-revenue + admin-relay-subscribers.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { relayApi, ApiCallError } from '@/lib/api'
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

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--green)',
  trialing: 'var(--blue)',
  past_due: 'var(--amber)',
  canceled: 'var(--red)',
  expired: 'var(--text-faint)',
}
function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || 'var(--text-faint)'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 12,
        color: c,
        background: 'color-mix(in srgb, currentColor 14%, transparent)',
      }}
    >
      {status}
    </span>
  )
}

export function RelayOverview() {
  const overview = useQuery({ queryKey: ['relay', 'overview'], queryFn: () => relayApi.overview() })
  const revenue = useQuery({ queryKey: ['relay', 'revenue'], queryFn: () => relayApi.revenue() })
  const subs = useQuery({ queryKey: ['relay', 'subscribers'], queryFn: () => relayApi.subscribers({ limit: 100 }) })

  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const refetchAll = () => {
    overview.refetch()
    revenue.refetch()
    subs.refetch()
  }
  const err = (overview.error || revenue.error || subs.error) as ApiCallError | undefined
  const loading = overview.isLoading || revenue.isLoading || subs.isLoading

  const ov = overview.data
  const rv = revenue.data
  const subscribers = subs.data?.subscribers ?? []

  return (
    <Page>
      <PageHeader
        title="Relay"
        subtitle="The commercial desktop product — subscriptions, revenue, engagement"
        actions={
          <button className="btn" onClick={refetchAll}>
            Refresh
          </button>
        }
      />

      {loading && !ov && !rv && <Loading label="Loading Relay metrics…" />}
      {err && <ErrorBanner message={err.message} onRetry={refetchAll} />}

      {(ov || rv) && (
        <div className="grid grid-4">
          <Stat label="Customers" value={fmtNum(ov?.customers)} sub={ov ? `${fmtNum(ov.signups_7d)} new this week` : undefined} />
          <Stat label="Active" value={fmtNum(rv?.active ?? ov?.entitlements.active)} sub="paying" />
          <Stat label="Trialing" value={fmtNum(rv?.trialing ?? ov?.entitlements.trialing)} sub="7-day trial" />
          <Stat label="Past due" value={fmtNum(rv?.pastDue ?? ov?.entitlements.past_due)} sub="dunning" />
        </div>
      )}

      {rv && (
        <div className="grid grid-4" style={{ marginTop: 14 }}>
          <Stat label="MRR" value={fmtMoney(rv.mrr)} sub="monthly recurring" />
          <Stat label="ARR" value={fmtMoney(rv.arr)} sub="annual recurring" />
          <Stat label="Churn" value={fmtPct(rv.churnRate)} sub="last 30 days" />
          <Stat label="New this month" value={fmtNum(rv.newThisMonth)} sub={`${fmtNum(rv.newThisWeek)} this week`} />
        </div>
      )}

      {rv && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="row between" style={{ alignItems: 'center' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              Booked revenue
            </div>
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
          <div className="tabnum" style={{ fontSize: 34, fontWeight: 500, lineHeight: 1.1, marginTop: 12 }}>
            {fmtMoney(rv.periodRevenue?.[period])}
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 4 }}>
            purchases + renewals − refunds
          </div>
        </div>
      )}

      {rv && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-title">Subscription activity · last 30 days</div>
          {(rv.activitySeries ?? []).some((d) => d.new || d.renewal || d.churn) ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={rv.activitySeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => fmtDate(d)}
                  tick={{ fill: 'var(--text-faint)', fontSize: 12 }}
                  stroke="var(--border)"
                  minTickGap={24}
                />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-faint)', fontSize: 12 }} stroke="var(--border)" width={32} />
                <Tooltip
                  labelFormatter={(d) => fmtDate(String(d))}
                  contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 10, color: 'var(--text)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="new" name="New" stroke="var(--green)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="renewal" name="Renewals" stroke="var(--blue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="churn" name="Churn" stroke="var(--red)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState>
              No subscription events yet — this fills in from the Paddle webhook as trials, purchases, renewals, and
              cancellations come in.
            </EmptyState>
          )}
        </div>
      )}

      {ov && (
        <div className="grid grid-3" style={{ marginTop: 14 }}>
          <Stat label="DAU" value={fmtNum(ov.engagement.dau)} sub="active today" />
          <Stat label="WAU" value={fmtNum(ov.engagement.wau)} sub="last 7 days" />
          <Stat label="MAU" value={fmtNum(ov.engagement.mau)} sub="last 30 days" />
        </div>
      )}

      {subscribers.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-title">Subscribers · {fmtNum(subs.data?.count)}</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Source</th>
                  <th className="nowrap">Renews</th>
                  <th className="nowrap">Joined</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.user_id}>
                    <td className="mono" style={{ fontSize: 12 }}>{s.user_id.slice(0, 8)}…</td>
                    <td><StatusPill status={s.status} /></td>
                    <td>{s.plan ?? '—'}</td>
                    <td>{s.source ?? '—'}</td>
                    <td className="nowrap">{fmtDate(s.current_period_end)}</td>
                    <td className="nowrap">{fmtDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Page>
  )
}
