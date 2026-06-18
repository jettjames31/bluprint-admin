// AI ADVISOR — an on-demand, brutally honest business advisor over your real
// metrics. Pick a model (cheap → smartest) and Analyze; it returns trends, red
// flags, benchmarks, and prioritized recommendations. On-demand only (each run
// is an Anthropic call, billed + shown on the AI Cost page).
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { advisorApi, ApiCallError } from '@/lib/api'
import type { AdvisorModel, AdvisorReport } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { EmptyState, ErrorBanner } from '@/components/ui'
import { AnalysisHistory } from '@/components/AnalysisHistory'

const MODEL_OPTS: { id: AdvisorModel; label: string; hint: string }[] = [
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', hint: 'fastest · cheapest' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', hint: 'smart · balanced' },
  { id: 'claude-opus-4-8', label: 'Opus 4.8', hint: 'smartest · priciest' },
]

const SEV_CLASS: Record<string, string> = { high: 'badge-red', medium: 'badge-amber', low: 'badge-gray' }
const DIR_ICON: Record<string, string> = { up: '▲', down: '▼', flat: '→' }
const DIR_COLOR: Record<string, string> = { up: 'var(--green)', down: 'var(--red)', flat: 'var(--text-faint)' }

export function Advisor() {
  const [model, setModel] = useState<AdvisorModel>('claude-sonnet-4-6')
  const [viewing, setViewing] = useState<AdvisorReport | null>(null)
  const history = useQuery({ queryKey: ['advisor-history'], queryFn: () => advisorApi.history() })
  const analyze = useMutation<AdvisorReport, ApiCallError>({
    mutationFn: () => advisorApi.analyze(model),
    onSuccess: () => {
      setViewing(null)
      history.refetch()
    },
  })
  const load = useMutation<AdvisorReport, ApiCallError, string>({
    mutationFn: (id) => advisorApi.get(id),
    onSuccess: (rep) => setViewing(rep),
  })
  const r = viewing ?? analyze.data

  return (
    <Page>
      <PageHeader
        title="AI Advisor"
        subtitle="A brutally honest read on the business — trends, red flags, and what to fix first"
        actions={
          <div className="row gap-8" style={{ alignItems: 'center' }}>
            <select
              className="select"
              value={model}
              onChange={(e) => setModel(e.target.value as AdvisorModel)}
              style={{ width: 'auto' }}
              disabled={analyze.isPending}
            >
              {MODEL_OPTS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.hint}
                </option>
              ))}
            </select>
            <button className="btn btn-gradient" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
              {analyze.isPending ? 'Analyzing…' : r ? 'Re-analyze' : 'Analyze'}
            </button>
          </div>
        }
      />

      <AnalysisHistory
        rows={history.data?.reports}
        activeId={r?.id}
        onSelect={(id) => load.mutate(id)}
        loadingId={load.isPending ? load.variables : null}
      />

      {analyze.isError && <ErrorBanner message={analyze.error.message} onRetry={() => analyze.mutate()} />}
      {load.isError && <ErrorBanner message={load.error.message} onRetry={() => load.variables && load.mutate(load.variables)} />}

      {!r && !analyze.isPending && !analyze.isError && !load.isPending && (
        <div className="card">
          <EmptyState>
            Pick a model and hit <strong>Analyze</strong>. The advisor reads your live metrics (users, revenue,
            subscriptions, AI usage, errors, leads) and gives an honest, prioritized read — including how you stack up
            against industry benchmarks. Each run is one AI call (billed; shows on the AI Cost page).
          </EmptyState>
        </div>
      )}

      {analyze.isPending && (
        <div className="card">
          <EmptyState>Thinking it through… a sharp read takes a few seconds.</EmptyState>
        </div>
      )}

      {r && (
        <>
          {/* Headline */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row gap-8" style={{ marginBottom: 8 }}>
              <span className="badge badge-purple">{r.stage}</span>
              {viewing && <span className="badge badge-gray">saved</span>}
              <span className="faint" style={{ fontSize: 12 }}>
                {MODEL_OPTS.find((m) => m.id === r.model)?.label ?? r.model}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{r.headline}</p>
            {r.confidence && (
              <p className="faint" style={{ marginTop: 10, marginBottom: 0, fontSize: 12.5, lineHeight: 1.6 }}>
                Confidence: {r.confidence}
              </p>
            )}
          </div>

          {/* The one thing */}
          {r.oneThing && (
            <div
              className="card"
              style={{ marginBottom: 14, borderColor: 'var(--purple)', background: 'var(--purple-dim)' }}
            >
              <div className="card-title" style={{ color: 'var(--purple)' }}>Do this first</div>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>{r.oneThing}</p>
            </div>
          )}

          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            {/* Red flags */}
            <div className="card">
              <div className="card-title">Red flags</div>
              {r.redFlags?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {r.redFlags.map((f, i) => (
                    <div key={i} style={{ borderTop: i ? '1px solid var(--border)' : 'none', paddingTop: i ? 10 : 0 }}>
                      <div className="row gap-8" style={{ alignItems: 'center', marginBottom: 4 }}>
                        <span className={`badge ${SEV_CLASS[f.severity] ?? 'badge-gray'}`}>{f.severity}</span>
                        <strong style={{ fontSize: 13.5 }}>{f.issue}</strong>
                      </div>
                      <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{f.why}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>No red flags called out.</EmptyState>
              )}
            </div>

            {/* Recommendations */}
            <div className="card">
              <div className="card-title">Recommendations</div>
              {r.recommendations?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...r.recommendations].sort((a, b) => a.priority - b.priority).map((rec, i) => (
                    <div key={i} style={{ borderTop: i ? '1px solid var(--border)' : 'none', paddingTop: i ? 10 : 0 }}>
                      <div className="row gap-8 between" style={{ alignItems: 'center', marginBottom: 4 }}>
                        <strong style={{ fontSize: 13.5 }}>
                          {rec.priority}. {rec.action}
                        </strong>
                        <span className="badge badge-gray">{rec.effort}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 13, lineHeight: 1.55 }}>{rec.rationale}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>No recommendations.</EmptyState>
              )}
            </div>
          </div>

          {/* Trends + working */}
          <div className="grid grid-2" style={{ marginTop: 14, alignItems: 'start' }}>
            <div className="card">
              <div className="card-title">Trends</div>
              {r.trends?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {r.trends.map((t, i) => (
                    <div key={i} className="row gap-8" style={{ alignItems: 'baseline' }}>
                      <span style={{ color: DIR_COLOR[t.direction] ?? 'var(--text-faint)', width: 14 }}>
                        {DIR_ICON[t.direction] ?? '→'}
                      </span>
                      <div>
                        <strong style={{ fontSize: 13 }}>{t.label}</strong>{' '}
                        <span className="muted" style={{ fontSize: 13 }}>— {t.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>No clear trends yet — not enough data.</EmptyState>
              )}
            </div>

            <div className="card">
              <div className="card-title">What's working</div>
              {r.working?.length ? (
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {r.working.map((w, i) => (
                    <li key={i} style={{ fontSize: 13, lineHeight: 1.55 }}>{w}</li>
                  ))}
                </ul>
              ) : (
                <EmptyState>Nothing notable yet — that's expected this early.</EmptyState>
              )}
            </div>
          </div>

          {/* Benchmarks */}
          {r.benchmarks?.length > 0 && (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="card-title">Benchmarks</div>
              <div className="faint" style={{ fontSize: 12, marginTop: -8, marginBottom: 12 }}>
                Industry/competitor estimates from the model's knowledge — directional, not live data.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>You</th>
                      <th>Benchmark</th>
                      <th>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.benchmarks.map((b, i) => (
                      <tr key={i}>
                        <td>{b.metric}</td>
                        <td className="tabnum">{b.you}</td>
                        <td className="tabnum muted">{b.benchmark}</td>
                        <td className="muted">{b.verdict}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="faint" style={{ fontSize: 12, marginTop: 16 }}>
            Generated {new Date(r.generatedAt).toLocaleString()} · grounded in your live metrics. Treat benchmarks as
            directional. Switch models above — Opus for the sharpest read when it matters.
          </p>
        </>
      )}
    </Page>
  )
}
