// AI MARKETING — competitive ad/growth strategist over your category + metrics.
// Pick a model, set the category/audience context (prefilled from the active
// app), Analyze → competitor landscape, what's working for them, what's not
// working for us, and prioritized channels/angles/ASO. On-demand (billed).
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { marketingApi, ApiCallError } from '@/lib/api'
import type { MarketingReport } from '@/types'
import { useActiveApp } from '@/lib/activeApp'
import { Page, PageHeader } from '@/components/Layout'
import { EmptyState, ErrorBanner } from '@/components/ui'
import { AnalysisHistory } from '@/components/AnalysisHistory'

const MODEL_OPTS = [
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 — fastest · cheapest' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 — smart · balanced' },
  { id: 'claude-opus-4-8', label: 'Opus 4.8 — smartest · priciest' },
]

// Sensible category defaults per known app (extend as the portfolio grows).
const CATEGORY_BY_APP: Record<string, string> = {
  bluprint: 'peptide & supplement tracking / longevity & biohacking health app',
}

export function Marketing() {
  const { app } = useActiveApp()
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [category, setCategory] = useState(CATEGORY_BY_APP[app.id] || `${app.name} category`)
  const [audience, setAudience] = useState('')
  const [notes, setNotes] = useState('')

  const [viewing, setViewing] = useState<MarketingReport | null>(null)
  const history = useQuery({ queryKey: ['marketing-history'], queryFn: () => marketingApi.history() })
  const run = useMutation<MarketingReport, ApiCallError>({
    mutationFn: () => marketingApi.analyze({ model, category, product: app.name, audience, notes }),
    onSuccess: () => {
      setViewing(null)
      history.refetch()
    },
  })
  const load = useMutation<MarketingReport, ApiCallError, string>({
    mutationFn: (id) => marketingApi.get(id),
    onSuccess: (rep) => setViewing(rep),
  })
  const r = viewing ?? run.data

  return (
    <Page>
      <PageHeader
        title="AI Marketing"
        subtitle="What competitors are doing in your category — and how to market against it"
        actions={
          <div className="row gap-8" style={{ alignItems: 'center' }}>
            <select className="select" value={model} onChange={(e) => setModel(e.target.value)} style={{ width: 'auto' }} disabled={run.isPending}>
              {MODEL_OPTS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <button className="btn btn-gradient" onClick={() => run.mutate()} disabled={run.isPending || !category.trim()}>
              {run.isPending ? 'Analyzing…' : r ? 'Re-analyze' : 'Analyze'}
            </button>
          </div>
        }
      />

      {/* Context */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">Context for {app.name}</div>
        <div className="field">
          <label className="label">Category</label>
          <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. peptide tracking / longevity health app" />
        </div>
        <div className="grid grid-2">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Target audience (optional)</label>
            <input className="input" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="e.g. 25–45 biohackers, gym-goers researching peptides" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Notes (optional)</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="budget, current channels, anything else" />
          </div>
        </div>
      </div>

      <AnalysisHistory
        rows={history.data?.reports}
        activeId={r?.id}
        onSelect={(id) => load.mutate(id)}
        loadingId={load.isPending ? load.variables : null}
      />

      {run.isError && <ErrorBanner message={run.error.message} onRetry={() => run.mutate()} />}
      {load.isError && <ErrorBanner message={load.error.message} onRetry={() => load.variables && load.mutate(load.variables)} />}
      {!r && !run.isPending && !run.isError && !load.isPending && (
        <div className="card">
          <EmptyState>
            Set the category and hit <strong>Analyze</strong>. You'll get the competitive landscape (who, their angle,
            what's working), what's <em>not</em> working for us, and prioritized channels, ad angles, and ASO — grounded
            in your real acquisition metrics. Each run is one AI call (billed; shows on AI Cost).
          </EmptyState>
        </div>
      )}
      {run.isPending && <div className="card"><EmptyState>Scouting the competition… a few seconds.</EmptyState></div>}

      {r && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="row gap-8" style={{ marginBottom: 8 }}>
              <span className="badge badge-purple">{r.category}</span>
              {viewing && <span className="badge badge-gray">saved</span>}
              <span className="faint" style={{ fontSize: 12 }}>{MODEL_OPTS.find((m) => m.id === r.model)?.label.split(' —')[0] ?? r.model}</span>
            </div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>{r.positioning}</p>
          </div>

          {r.oneThing && (
            <div className="card" style={{ marginBottom: 14, borderColor: 'var(--purple)', background: 'var(--purple-dim)' }}>
              <div className="card-title" style={{ color: 'var(--purple)' }}>Do this first</div>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>{r.oneThing}</p>
            </div>
          )}

          {/* Competitors */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Competitor landscape</div>
            <div className="faint" style={{ fontSize: 12, marginTop: -8, marginBottom: 12 }}>
              Knowledge-based (not live ad data) — directional.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(r.competitors ?? []).map((c, i) => (
                <div key={i} style={{ borderTop: i ? '1px solid var(--border)' : 'none', paddingTop: i ? 12 : 0 }}>
                  <div className="row gap-8 between" style={{ alignItems: 'baseline' }}>
                    <strong>{c.name}</strong>
                    <span className="faint" style={{ fontSize: 12 }}>{c.channels}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{c.angle}</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    <span style={{ color: 'var(--green)' }}>Working:</span> {c.working}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 3 }}>
                    <span style={{ color: 'var(--blue)' }}>Your opening:</span> {c.gap}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            {/* Channels */}
            <div className="card">
              <div className="card-title">Channels to prioritize</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...(r.channels ?? [])].sort((a, b) => a.priority - b.priority).map((c, i) => (
                  <div key={i} style={{ borderTop: i ? '1px solid var(--border)' : 'none', paddingTop: i ? 10 : 0 }}>
                    <strong style={{ fontSize: 13.5 }}>{c.priority}. {c.channel}</strong>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{c.why}</div>
                    <div style={{ fontSize: 12.5, marginTop: 4 }}><span className="faint">First step:</span> {c.firstStep}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* What's not working for us */}
            <div className="card">
              <div className="card-title">What's not working for us</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(r.whatsNotWorkingForUs ?? []).map((w, i) => (
                  <div key={i} style={{ borderTop: i ? '1px solid var(--border)' : 'none', paddingTop: i ? 10 : 0 }}>
                    <strong style={{ fontSize: 13.5 }}>{w.issue}</strong>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{w.why}</div>
                    <div style={{ fontSize: 12.5, marginTop: 4 }}><span style={{ color: 'var(--green)' }}>Fix:</span> {w.fix}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Angles */}
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-title">Ad / message angles to test</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Hook</th><th>Audience</th><th>Format</th></tr></thead>
                <tbody>
                  {(r.angles ?? []).map((a, i) => (
                    <tr key={i}><td>{a.hook}</td><td className="muted">{a.audience}</td><td className="muted nowrap">{a.format}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: 14, alignItems: 'start' }}>
            {/* Working in category */}
            <div className="card">
              <div className="card-title">Working in the category (steal these)</div>
              <ul className="clean" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(r.whatsWorkingInCategory ?? []).map((w, i) => (
                  <li key={i} style={{ fontSize: 13, lineHeight: 1.55 }}>{w}</li>
                ))}
              </ul>
            </div>

            {/* ASO */}
            <div className="card">
              <div className="card-title">App Store optimization</div>
              <div className="faint" style={{ fontSize: 12, marginBottom: 8 }}>Keywords</div>
              <div className="row gap-8 wrap" style={{ marginBottom: 12 }}>
                {(r.aso?.keywords ?? []).map((k, i) => <span key={i} className="badge badge-gray">{k}</span>)}
              </div>
              <div className="faint" style={{ fontSize: 12, marginBottom: 6 }}>Title / subtitle ideas</div>
              <ul className="clean" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(r.aso?.titleIdeas ?? []).map((t, i) => <li key={i} style={{ fontSize: 13 }}>{t}</li>)}
              </ul>
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: 14, alignItems: 'start' }}>
            <div className="card">
              <div className="card-title">Quick wins</div>
              <ul className="clean" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(r.quickWins ?? []).map((w, i) => <li key={i} style={{ fontSize: 13, lineHeight: 1.55 }}>{w}</li>)}
              </ul>
            </div>
            <div className="card">
              <div className="card-title">Bigger bets</div>
              <ul className="clean" style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(r.bigBets ?? []).map((w, i) => <li key={i} style={{ fontSize: 13, lineHeight: 1.55 }}>{w}</li>)}
              </ul>
            </div>
          </div>

          <p className="faint" style={{ fontSize: 12, marginTop: 16 }}>
            Generated {new Date(r.generatedAt).toLocaleString()} · competitor intel is from the model's knowledge
            (directional, not live ad data). {r.confidence}
          </p>
        </>
      )}
    </Page>
  )
}
