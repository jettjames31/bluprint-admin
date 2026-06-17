// AI MONITORING — two read-only views over AI usage.
//   1. Aggregate counters from the rate_limits buckets (counts only, no
//      content) via admin-users `aiUsage`. The backend can only retain ~24h of
//      counters, so week/month are best-effort approximations of the current
//      window — flagged in the stat-sub.
//   2. The (privacy-gated, OFF-by-default) ai_queries content log via
//      admin-ai-queries. When the `ai_query_logging` flag is off the function
//      returns `enabled: false` and no rows — we render an explainer rather
//      than imply logging is broken (see DECISIONS.md).
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { aiApi, ApiCallError } from '@/lib/api'
import type { AiQuery } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, Modal } from '@/components/ui'
import { fmtDateTime, fmtNum } from '@/lib/format'

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub != null && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function truncate(s: string | null | undefined, max = 90): string {
  if (!s) return '—'
  const t = s.trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

export function AiMonitoring() {
  const [selected, setSelected] = useState<AiQuery | null>(null)

  const usageQ = useQuery({
    queryKey: ['ai-usage'],
    queryFn: () => aiApi.usage(),
  })

  const queriesQ = useQuery({
    queryKey: ['ai-queries'],
    queryFn: () => aiApi.queries(),
  })

  const usage = usageQ.data
  const queriesData = queriesQ.data

  function refreshAll() {
    usageQ.refetch()
    queriesQ.refetch()
  }

  const loading = usageQ.isLoading || queriesQ.isLoading

  return (
    <Page>
      <PageHeader
        title="AI Monitoring"
        subtitle="Usage counters + the privacy-gated query content log"
        actions={
          <button className="btn" onClick={refreshAll}>
            Refresh
          </button>
        }
      />

      {loading && <Loading label="Loading AI usage…" />}
      {usageQ.error && (
        <ErrorBanner message={(usageQ.error as ApiCallError).message} onRetry={() => usageQ.refetch()} />
      )}

      {usage && (
        <>
          <div className="grid grid-3">
            <Stat label="Today" value={fmtNum(usage.today)} />
            <Stat label="This week" value={fmtNum(usage.week)} sub="approx — current window" />
            <Stat label="This month" value={fmtNum(usage.month)} sub="approx — current window" />
          </div>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <div className="card">
              <div className="card-title">Top users by AI usage</div>
              {usage.byUser.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th className="right">Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.byUser.map((u) => (
                      <tr key={u.user_id}>
                        <td className="mono">{u.email || u.user_id}</td>
                        <td className="right tabnum">{fmtNum(u.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState>No AI usage recorded yet.</EmptyState>
              )}
            </div>

            <div className="card">
              <div className="card-title">High usage (50+/hr)</div>
              {usage.highUsage.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th className="right">Requests</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {usage.highUsage.map((u) => (
                      <tr key={u.user_id}>
                        <td className="mono">{u.email || u.user_id}</td>
                        <td className="right tabnum">{fmtNum(u.count)}</td>
                        <td className="right nowrap">
                          <span className="badge badge-amber">high</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState>No high-usage users.</EmptyState>
              )}
            </div>
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-title">Query content log</div>

        {queriesQ.error && (
          <ErrorBanner message={(queriesQ.error as ApiCallError).message} onRetry={() => queriesQ.refetch()} />
        )}

        {queriesData && queriesData.enabled === false && (
          <EmptyState>
            <div style={{ maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
              AI query logging is <strong>off by default</strong> for user privacy. No question or response content is
              stored.
              <div className="faint" style={{ marginTop: 10, fontSize: 12 }}>
                Flip the <span className="mono">ai_query_logging</span> feature flag to capture content for debugging.
                See DECISIONS.md for the privacy rationale.
              </div>
            </div>
          </EmptyState>
        )}

        {queriesData && queriesData.enabled && !queriesData.queries.length && (
          <EmptyState>Logging is on, but no queries have been recorded yet.</EmptyState>
        )}

        {queriesData && queriesData.enabled && queriesData.queries.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Mode</th>
                <th>Question</th>
                <th>Response</th>
              </tr>
            </thead>
            <tbody>
              {queriesData.queries.map((q) => (
                <tr key={q.id} className="row-click" onClick={() => setSelected(q)}>
                  <td className="muted nowrap">{fmtDateTime(q.created_at)}</td>
                  <td className="mono">{q.user_id || '—'}</td>
                  <td>
                    {q.mode ? <span className="badge badge-purple">{q.mode}</span> : <span className="faint">—</span>}
                  </td>
                  <td>{truncate(q.question)}</td>
                  <td className="muted">{truncate(q.response)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && <QueryDetail query={selected} onClose={() => setSelected(null)} />}
    </Page>
  )
}

function QueryDetail({ query, onClose }: { query: AiQuery; onClose: () => void }) {
  return (
    <Modal title="AI query" onClose={onClose} wide>
      <div className="row gap-12 wrap" style={{ marginBottom: 16 }}>
        <div className="faint" style={{ fontSize: 12 }}>
          {fmtDateTime(query.created_at)}
        </div>
        {query.mode && <span className="badge badge-purple">{query.mode}</span>}
        <span className="mono">{query.user_id || 'unknown user'}</span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="card-title">Question</div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{query.question}</div>
      </div>

      <div>
        <div className="card-title">Response</div>
        <div className="muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {query.response || 'No response recorded.'}
        </div>
      </div>
    </Modal>
  )
}
