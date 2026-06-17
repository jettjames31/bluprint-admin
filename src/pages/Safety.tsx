// SAFETY — AI safety queue, dosing/off-library hotspots, adverse-event reports,
// and user feedback, sourced from the admin-safety function. The AI safety queue
// is gated on the privacy-by-default ai_queries content log: when logging is OFF
// the function reports `enabled: false` and there's nothing to show (see
// DECISIONS.md). Adverse events can be triaged via a status <select>.
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { safetyApi, ApiCallError } from '@/lib/api'
import type { AiQuery, AdverseEvent } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, Modal, useToast } from '@/components/ui'
import { fmtDateTime } from '@/lib/format'

const ADVERSE_STATUSES = ['new', 'reviewing', 'resolved', 'dismissed'] as const

function truncate(s: string | null | undefined, max = 90): string {
  if (!s) return '—'
  const t = s.trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function severityBadge(severity: string) {
  const s = severity.toLowerCase()
  const cls = s === 'severe' ? 'badge-red' : s === 'moderate' ? 'badge-amber' : 'badge-gray'
  return <span className={`badge ${cls}`}>{severity || 'mild'}</span>
}

function statusBadge(status: string) {
  const s = status.toLowerCase()
  const cls =
    s === 'resolved' ? 'badge-green' : s === 'dismissed' ? 'badge-gray' : s === 'reviewing' ? 'badge-blue' : 'badge-amber'
  return <span className={`badge ${cls}`}>{status || 'new'}</span>
}

function ratingStars(rating: number | null): string {
  if (rating == null) return '—'
  const r = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(r) + '☆'.repeat(5 - r)
}

export function Safety() {
  const [selectedQuery, setSelectedQuery] = useState<AiQuery | null>(null)
  const qc = useQueryClient()
  const toast = useToast()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['safety'],
    queryFn: () => safetyApi.summary(),
  })

  const resolve = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => safetyApi.resolveAdverse(id, status),
    onSuccess: () => {
      toast('Adverse event updated.', 'ok')
      qc.invalidateQueries({ queryKey: ['safety'] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  return (
    <Page>
      <PageHeader
        title="Safety"
        subtitle="AI safety queue, adverse events, and user feedback"
        actions={
          <button className="btn" onClick={() => refetch()}>
            Refresh
          </button>
        }
      />

      {isLoading && <Loading label="Loading safety data…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <div className="grid" style={{ gap: 14 }}>
          {/* --- AI safety queue --- */}
          <div className="card" style={{ padding: 0 }}>
            <div className="row between" style={{ padding: '16px 18px 0' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>
                AI safety queue
              </div>
              {data.enabled && data.flagged.length > 0 && (
                <span className="faint" style={{ fontSize: 12 }}>
                  {data.flagged.length} flagged
                </span>
              )}
            </div>

            {!data.enabled ? (
              <EmptyState>
                AI conversation logging is <strong>OFF</strong>. Flagged conversations populate here once the{' '}
                <span className="mono">ai_queries</span> content log is enabled (privacy-by-default; see{' '}
                <span className="mono">DECISIONS.md</span>).
              </EmptyState>
            ) : data.flagged.length === 0 ? (
              <EmptyState>No flagged conversations. Nothing needs review.</EmptyState>
            ) : (
              <div style={{ marginTop: 14 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Flag</th>
                      <th>Question</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.flagged.map((q) => (
                      <tr key={q.id} className="row-click" onClick={() => setSelectedQuery(q)}>
                        <td className="muted nowrap">{fmtDateTime(q.created_at)}</td>
                        <td>
                          <span className="mono">{q.user_id ? q.user_id.slice(0, 8) : '—'}</span>
                        </td>
                        <td>
                          <span className="badge badge-amber">{q.mode || 'flagged'}</span>
                        </td>
                        <td className="muted">{truncate(q.question, 80)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* --- hotspots --- */}
          <div className="grid grid-2">
            <div className="card" style={{ padding: 0 }}>
              <div className="card-title" style={{ padding: '16px 18px 0', marginBottom: 0 }}>
                Dosing-request hotspots
              </div>
              {data.dosingHotspots.length === 0 ? (
                <EmptyState>No dosing requests detected.</EmptyState>
              ) : (
                <table className="table" style={{ marginTop: 14 }}>
                  <thead>
                    <tr>
                      <th>Compound</th>
                      <th className="right">Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dosingHotspots.map((h) => (
                      <tr key={h.compound}>
                        <td>{h.compound}</td>
                        <td className="right tabnum">{h.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={{ padding: 0 }}>
              <div className="card-title" style={{ padding: '16px 18px 0', marginBottom: 0 }}>
                Off-library AI mentions
              </div>
              {data.offLibraryMentions.length === 0 ? (
                <EmptyState>No off-library compounds mentioned.</EmptyState>
              ) : (
                <table className="table" style={{ marginTop: 14 }}>
                  <thead>
                    <tr>
                      <th>Compound</th>
                      <th className="right">Mentions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.offLibraryMentions.map((m) => (
                      <tr key={m.compound}>
                        <td>{m.compound}</td>
                        <td className="right tabnum">{m.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* --- adverse events --- */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-title" style={{ padding: '16px 18px 0', marginBottom: 0 }}>
              Adverse event reports
            </div>
            {data.adverse.length === 0 ? (
              <EmptyState>No adverse events reported.</EmptyState>
            ) : (
              <table className="table" style={{ marginTop: 14 }}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Compound</th>
                    <th>Severity</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Triage</th>
                  </tr>
                </thead>
                <tbody>
                  {data.adverse.map((ev: AdverseEvent) => (
                    <tr key={ev.id}>
                      <td className="muted nowrap">{fmtDateTime(ev.created_at)}</td>
                      <td className="muted">{ev.email || (ev.user_id ? <span className="mono">{ev.user_id.slice(0, 8)}</span> : '—')}</td>
                      <td className="mono">{ev.compound_id || '—'}</td>
                      <td>{severityBadge(ev.severity)}</td>
                      <td className="muted">{truncate(ev.description, 70)}</td>
                      <td>{statusBadge(ev.status)}</td>
                      <td>
                        <select
                          className="select"
                          style={{ width: 130 }}
                          value={ADVERSE_STATUSES.includes(ev.status as (typeof ADVERSE_STATUSES)[number]) ? ev.status : 'new'}
                          disabled={resolve.isPending}
                          onChange={(e) => resolve.mutate({ id: ev.id, status: e.target.value })}
                        >
                          {ADVERSE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* --- feedback --- */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-title" style={{ padding: '16px 18px 0', marginBottom: 0 }}>
              User feedback
            </div>
            {data.feedback.length === 0 ? (
              <EmptyState>No feedback submitted yet.</EmptyState>
            ) : (
              <table className="table" style={{ marginTop: 14 }}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Rating</th>
                    <th>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {data.feedback.map((f) => (
                    <tr key={f.id}>
                      <td className="muted nowrap">{fmtDateTime(f.created_at)}</td>
                      <td className="muted">{f.email || (f.user_id ? <span className="mono">{f.user_id.slice(0, 8)}</span> : '—')}</td>
                      <td className="nowrap" style={{ color: 'var(--amber)', letterSpacing: 1 }}>
                        {ratingStars(f.rating)}
                      </td>
                      <td className="muted">{truncate(f.body, 90)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {data.note && (
            <p className="faint" style={{ fontSize: 12, lineHeight: 1.6, margin: '2px 2px 0' }}>
              {data.note}
            </p>
          )}
        </div>
      )}

      {selectedQuery && (
        <Modal title="Flagged conversation" onClose={() => setSelectedQuery(null)} wide>
          <div className="row gap-8 between" style={{ marginBottom: 14 }}>
            <span className="badge badge-amber">{selectedQuery.mode || 'flagged'}</span>
            <span className="faint" style={{ fontSize: 12 }}>
              {fmtDateTime(selectedQuery.created_at)} · <span className="mono">{selectedQuery.user_id ?? 'anon'}</span>
            </span>
          </div>
          <div className="field">
            <div className="label">Question</div>
            <div
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                fontSize: 13,
              }}
            >
              {selectedQuery.question}
            </div>
          </div>
          <div className="field">
            <div className="label">Response</div>
            <div
              className="muted"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                fontSize: 13,
              }}
            >
              {selectedQuery.response || 'No response logged.'}
            </div>
          </div>
        </Modal>
      )}
    </Page>
  )
}
