// RELAY — analytics. Feature usage from the analytics stream: event volume + DAU over 30 days, top events,
// and app-version spread. admin-relay-analytics.
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { relayApi, ApiCallError } from '@/lib/api'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner } from '@/components/ui'
import { fmtDate, fmtNum } from '@/lib/format'

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub != null && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function RelayAnalytics() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['relay', 'analytics'], queryFn: () => relayApi.analytics() })

  return (
    <Page>
      <PageHeader
        title="Relay · Analytics"
        subtitle="Feature usage over the last 30 days"
        actions={<button className="btn" onClick={() => refetch()}>Refresh</button>}
      />

      {isLoading && <Loading label="Loading analytics…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-4">
            <Stat label="Events" value={fmtNum(data.total)} sub="last 30 days" />
            <Stat label="Active users" value={fmtNum(data.users)} sub="sent an event" />
            <Stat label="Event types" value={fmtNum(data.topEvents.length)} sub="distinct" />
            <Stat label="Avg / user" value={data.users ? fmtNum(Math.round(data.total / data.users)) : '—'} sub="events per user" />
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-title">Volume · last 30 days</div>
            {data.series.some((d) => d.events) ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.series} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d: string) => fmtDate(d)} tick={{ fill: 'var(--text-faint)', fontSize: 12 }} stroke="var(--border)" minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--text-faint)', fontSize: 12 }} stroke="var(--border)" width={36} />
                  <Tooltip labelFormatter={(d) => fmtDate(String(d))} contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', borderRadius: 10, color: 'var(--text)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="events" name="Events" stroke="var(--blue)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="users" name="Active users" stroke="var(--green)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState>No analytics events yet — they arrive as the desktop app reports usage.</EmptyState>
            )}
          </div>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <div className="card">
              <div className="card-title">Top events</div>
              {data.topEvents.length ? (
                <table className="table">
                  <thead><tr><th>Event</th><th className="right">Count</th></tr></thead>
                  <tbody>
                    {data.topEvents.map((e) => (
                      <tr key={e.name}>
                        <td className="mono" style={{ fontSize: 12 }}>{e.name}</td>
                        <td className="right tabnum">{fmtNum(e.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState>No events yet.</EmptyState>
              )}
            </div>
            <div className="card">
              <div className="card-title">App versions</div>
              {data.versions.length ? (
                <table className="table">
                  <thead><tr><th>Version</th><th className="right">Events</th></tr></thead>
                  <tbody>
                    {data.versions.map((v) => (
                      <tr key={v.version}>
                        <td className="mono" style={{ fontSize: 12 }}>{v.version}</td>
                        <td className="right tabnum">{fmtNum(v.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState>No version data yet.</EmptyState>
              )}
            </div>
          </div>
        </>
      )}
    </Page>
  )
}
