// Shared "Past analyses" list for the AI Advisor + AI Marketing pages. Lists
// saved runs (summary + date + model); clicking one loads it.
import type { AnalysisHistoryRow } from '@/types'
import { fmtDate } from '@/lib/format'

const shortModel = (m: string) =>
  m.replace('claude-', '').replace('haiku-4-5', 'Haiku').replace('sonnet-4-6', 'Sonnet').replace('opus-4-8', 'Opus')

export function AnalysisHistory({
  rows,
  activeId,
  onSelect,
  loadingId,
}: {
  rows: AnalysisHistoryRow[] | undefined
  activeId?: string | null
  onSelect: (id: string) => void
  loadingId?: string | null
}) {
  if (!rows || rows.length === 0) return null
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-title">Past analyses</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((h, i) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onSelect(h.id)}
            className="row gap-8 between"
            style={{
              textAlign: 'left',
              width: '100%',
              padding: '9px 10px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              borderTop: i ? '1px solid var(--border)' : 'none',
              background: h.id === activeId ? 'var(--surface-2)' : 'transparent',
            }}
          >
            <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {loadingId === h.id ? 'Loading…' : h.summary}
            </span>
            <span className="faint" style={{ fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {fmtDate(h.created_at)} · {shortModel(h.model)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
