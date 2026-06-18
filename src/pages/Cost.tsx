// AI COST — Anthropic spend sourced from the ai_usage cost log via the
// admin-cost function. The content/cost log is privacy-gated and off by
// default; when AI logging is disabled the function reports `enabled: false`
// and we render an explainer instead of metrics.
import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { costApi, ApiCallError } from '@/lib/api'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner } from '@/components/ui'
import { fmtDate, fmtMoney, fmtNum, fmtPct } from '@/lib/format'
import { useLarp } from '@/lib/larp'
import { larpCost } from '@/lib/larpData'

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub != null && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function Cost() {
  const q = useQuery({
    queryKey: ['cost'],
    queryFn: () => costApi.summary(),
  })
  const { isLoading, error, refetch } = q
  const { larp, seed } = useLarp()
  // Shadow `data` so the whole render below uses the LARP overlay transparently.
  const data = q.data && larp ? larpCost(q.data, seed) : q.data

  return (
    <Page>
      <PageHeader
        title="AI Cost"
        subtitle="Anthropic spend on Claude calls"
        actions={
          <button className="btn" onClick={() => refetch()}>
            Refresh
          </button>
        }
      />

      {isLoading && <Loading label="Loading cost…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && !data.enabled && (
        <div className="card">
          <div className="card-title">AI cost tracking is off</div>
          <EmptyState>
            AI logging is currently <strong>OFF</strong>, so there's no spend to report. Cost tracking populates here
            once logging is enabled in the <span className="mono">admin-cost</span> pipeline — it tallies your
            Anthropic spend across Claude calls, broken down by day, model, and user.
          </EmptyState>
          {data.note && (
            <p className="muted" style={{ marginTop: 4, fontSize: 13, lineHeight: 1.6 }}>
              {data.note}
            </p>
          )}
        </div>
      )}

      {data && data.enabled && (
        <>
          <div className="grid grid-3">
            <Stat label="Spend today" value={fmtMoney(data.today)} sub="Anthropic" />
            <Stat label="Spend this month" value={fmtMoney(data.month)} sub="month to date" />
            <Stat
              label="Projected 30d"
              value={fmtMoney(data.projected30d)}
              sub={`cache hit rate ${fmtPct(data.cacheHitRate)}`}
            />
          </div>

          {data.byDay.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-title">Cost by day</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.byDay} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
                    formatter={(v: number) => [fmtMoney(v), 'Cost']}
                    contentStyle={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 10,
                      color: 'var(--text)',
                    }}
                  />
                  <Line type="monotone" dataKey="cost" stroke="var(--text)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-title" style={{ padding: '16px 16px 0' }}>
                Cost by model
              </div>
              {data.byModel.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th className="right">Count</th>
                      <th className="right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byModel.map((m) => (
                      <tr key={m.model}>
                        <td className="mono">{m.model}</td>
                        <td className="right tabnum">{fmtNum(m.count)}</td>
                        <td className="right tabnum">{fmtMoney(m.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState>No model breakdown yet.</EmptyState>
              )}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-title" style={{ padding: '16px 16px 0' }}>
                Top users by cost
              </div>
              {data.byUser.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th className="right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byUser.map((u) => (
                      <tr key={u.user_id}>
                        <td className="mono">{u.email || u.user_id}</td>
                        <td className="right tabnum">{fmtMoney(u.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState>No per-user costs yet.</EmptyState>
              )}
            </div>
          </div>

          {data.note && (
            <p className="muted" style={{ marginTop: 14, fontSize: 13, lineHeight: 1.6 }}>
              {data.note}
            </p>
          )}
        </>
      )}
    </Page>
  )
}
