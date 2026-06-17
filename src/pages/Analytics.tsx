// ANALYTICS — product engagement at a glance, sourced from the admin-analytics
// function. Activity (DAU/WAU/MAU), profile distributions (goals/experience/
// gender), search & content-gap signals, the real-world co-occurrence stack
// graph, a high-risk watch list, and an event funnel. The funnel and several
// signal tables only fill in once app analytics events are flowing — every
// section degrades to a quiet "No data yet" rather than an empty void.
import { useQuery } from '@tanstack/react-query'
import { analyticsApi, ApiCallError } from '@/lib/api'
import type { AnalyticsSummary, Distribution } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner } from '@/components/ui'
import { fmtNum, fmtPct } from '@/lib/format'

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub != null && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      {children}
    </div>
  )
}

function NoData() {
  return (
    <div className="muted" style={{ fontSize: 13, padding: '6px 0' }}>
      No data yet
    </div>
  )
}

// Plain CSS horizontal bars — lighter than recharts for a handful of buckets.
function BarList({ rows }: { rows: Distribution[] }) {
  if (!rows.length) return <NoData />
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="row between" style={{ marginBottom: 4, fontSize: 12 }}>
            <span className="nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.label || '—'}
            </span>
            <span className="faint tabnum">{fmtNum(r.count)}</span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: 'var(--surface-2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(r.count / max) * 100}%`,
                minWidth: r.count > 0 ? 2 : 0,
                borderRadius: 999,
                background: 'var(--text)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// A compact two-column "label → count" table used by the search/signal cards.
function CountTable({
  title,
  rows,
  keyLabel,
}: {
  title: string
  rows: { key: string; count: number; trail?: React.ReactNode }[]
  keyLabel: string
}) {
  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <NoData />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{keyLabel}</th>
              <th className="right">Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.key}-${i}`}>
                <td>
                  <span className="mono">{r.key || '—'}</span>
                  {r.trail}
                </td>
                <td className="right tabnum">{fmtNum(r.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function Funnel({ steps }: { steps: AnalyticsSummary['funnel'] }) {
  if (!steps.length) {
    return (
      <Card title="Funnel">
        <EmptyState>No event data yet — ships once app analytics are enabled.</EmptyState>
      </Card>
    )
  }
  const top = steps[0]?.count || 0
  return (
    <Card title="Funnel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map((s, i) => {
          const prev = i === 0 ? s.count : steps[i - 1].count
          const dropPct = prev > 0 ? 1 - s.count / prev : 0
          const widthPct = top > 0 ? (s.count / top) * 100 : 0
          return (
            <div key={`${s.step}-${i}`}>
              <div className="row between" style={{ marginBottom: 5, fontSize: 13 }}>
                <span style={{ fontWeight: 550 }}>{s.step}</span>
                <span className="row gap-8">
                  <span className="tabnum">{fmtNum(s.count)}</span>
                  {i > 0 && (
                    <span className={`badge ${dropPct > 0 ? 'badge-amber' : 'badge-gray'}`}>
                      −{(dropPct * 100).toFixed(1)}%
                    </span>
                  )}
                </span>
              </div>
              <div
                style={{
                  height: 12,
                  borderRadius: 999,
                  background: 'var(--surface-2)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${widthPct}%`,
                    minWidth: s.count > 0 ? 2 : 0,
                    borderRadius: 999,
                    background: 'var(--text)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function Analytics() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.summary(),
  })

  return (
    <Page>
      <PageHeader
        title="Analytics"
        subtitle="Product engagement, profile mix, and search signals"
        actions={
          <button className="btn" onClick={() => refetch()}>
            Refresh
          </button>
        }
      />

      {isLoading && <Loading label="Loading analytics…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <>
          {data.note && (
            <div className="card" style={{ marginBottom: 14 }}>
              <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                {data.note}
              </p>
            </div>
          )}

          {/* Activity */}
          <div className="grid grid-3">
            <Stat label="DAU" value={fmtNum(data.dau)} sub="Daily active" />
            <Stat label="WAU" value={fmtNum(data.wau)} sub="Weekly active" />
            <Stat label="MAU" value={fmtNum(data.mau)} sub="Monthly active" />
          </div>
          <div className="grid grid-3" style={{ marginTop: 14 }}>
            <Stat label="DAU / MAU" value={fmtPct(data.dauMauRatio)} sub="Stickiness" />
            <Stat label="Health-flag rate" value={fmtPct(data.healthFlagRate)} sub="Users w/ a flag noted" />
            <Stat label="Physician rate" value={fmtPct(data.physicianRate)} sub="Users w/ a physician" />
          </div>

          {/* Profile distributions */}
          <div className="grid grid-3" style={{ marginTop: 14 }}>
            <Card title="Goals">
              <BarList rows={data.goals} />
            </Card>
            <Card title="Experience">
              <BarList rows={data.experience} />
            </Card>
            <Card title="Gender">
              <BarList rows={data.genders} />
            </Card>
          </div>

          {/* Search & content signals */}
          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <CountTable
              title="Most bookmarked compounds"
              keyLabel="Compound"
              rows={data.topBookmarked.map((r) => ({ key: r.id, count: r.count }))}
            />
            <CountTable
              title="Top searches"
              keyLabel="Query"
              rows={data.topSearched.map((r) => ({ key: r.query, count: r.count }))}
            />
            <CountTable
              title="Content gaps (no results)"
              keyLabel="Query"
              rows={data.emptySearches.map((r) => ({ key: r.query, count: r.count }))}
            />
            <CountTable
              title="Scan misses"
              keyLabel="Scanned value"
              rows={data.scanMisses.map((r) => ({ key: r.value, count: r.count }))}
            />
          </div>

          {/* Trending */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-title">Trending searches</div>
            {data.trending.length === 0 ? (
              <NoData />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th className="right">Now</th>
                    <th className="right">Prev</th>
                    <th className="right">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trending.map((t, i) => {
                    const delta = t.count - t.prev
                    const cls = delta > 0 ? 'badge-green' : delta < 0 ? 'badge-red' : 'badge-gray'
                    return (
                      <tr key={`${t.query}-${i}`}>
                        <td>
                          <span className="mono">{t.query || '—'}</span>
                        </td>
                        <td className="right tabnum">{fmtNum(t.count)}</td>
                        <td className="right tabnum muted">{fmtNum(t.prev)}</td>
                        <td className="right">
                          <span className={`badge ${cls}`}>
                            {delta > 0 ? '+' : ''}
                            {fmtNum(delta)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Real-world stack graph (co-occurring compounds) */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-title">Real-world stack graph</div>
            <div className="faint" style={{ fontSize: 12, marginTop: -8, marginBottom: 12 }}>
              Compounds users research together
            </div>
            {data.stackGraph.length === 0 ? (
              <NoData />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Compound A</th>
                    <th>Compound B</th>
                    <th className="right">Together</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stackGraph.map((s, i) => (
                    <tr key={`${s.a}-${s.b}-${i}`}>
                      <td>
                        <span className="mono">{s.a || '—'}</span>
                      </td>
                      <td>
                        <span className="mono">{s.b || '—'}</span>
                      </td>
                      <td className="right tabnum">{fmtNum(s.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* High-risk watch list */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="row gap-8" style={{ marginBottom: 12 }}>
              <span className="dot dot-red" />
              <span className="card-title" style={{ marginBottom: 0 }}>
                High-risk watch list
              </span>
            </div>
            {data.highRiskWatch.length === 0 ? (
              <NoData />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Flags</th>
                    <th>Compounds</th>
                  </tr>
                </thead>
                <tbody>
                  {data.highRiskWatch.map((w) => (
                    <tr key={w.user_id}>
                      <td>
                        <div style={{ fontWeight: 550 }}>{w.email || '—'}</div>
                        <div className="faint mono">{w.user_id.slice(0, 8)}</div>
                      </td>
                      <td>
                        <div className="row gap-8 wrap">
                          {w.flags.length ? (
                            w.flags.map((f, i) => (
                              <span key={`${f}-${i}`} className="badge badge-red">
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className="faint">—</span>
                          )}
                        </div>
                      </td>
                      <td className="muted">{w.compounds.length ? w.compounds.join(', ') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Funnel */}
          <div style={{ marginTop: 14 }}>
            <Funnel steps={data.funnel} />
          </div>
        </>
      )}
    </Page>
  )
}
