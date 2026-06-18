// BLENDS — CMS for the in-app blends (curated multi-compound stacks). Reads the
// server table via admin-blends; add/edit (with a compound picker), toggle
// visibility, delete. Mirrors the Compounds page.
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { blendsApi, compoundsApi, ApiCallError } from '@/lib/api'
import type { Blend, Compound } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, Modal, ConfirmModal, useToast } from '@/components/ui'

const listToText = (a?: string[]) => (a || []).join('\n')
const textToList = (s: string) =>
  s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean)

export function Blends() {
  const qc = useQueryClient()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Blend | null>(null)
  const [toDelete, setToDelete] = useState<Blend | null>(null)

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['blends'], queryFn: () => blendsApi.list() })

  const toggle = useMutation({
    mutationFn: (b: Blend) => blendsApi.toggle(b.id, !b.hidden),
    onSuccess: (_r, b) => {
      toast(b.hidden ? 'Blend shown.' : 'Blend hidden.', 'ok')
      qc.invalidateQueries({ queryKey: ['blends'] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })
  const del = useMutation({
    mutationFn: (id: string) => blendsApi.remove(id),
    onSuccess: () => {
      toast('Blend deleted.', 'ok')
      qc.invalidateQueries({ queryKey: ['blends'] })
      setToDelete(null)
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const blends = data?.blends ?? []

  return (
    <Page>
      <PageHeader
        title="Blends"
        subtitle="Curated multi-compound stacks shown in the app library"
        actions={
          <div className="row gap-8">
            <button className="btn btn-primary" onClick={() => setAdding(true)}>Add blend</button>
            <button className="btn" onClick={() => refetch()}>Refresh</button>
          </div>
        }
      />

      {isLoading && <Loading label="Loading blends…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Members</th><th>Tagline</th><th>Visibility</th><th className="right"></th></tr>
            </thead>
            <tbody>
              {blends.map((b) => (
                <tr key={b.id} className="row-click" onClick={() => setEditing(b)}>
                  <td>
                    <div style={{ fontWeight: 550 }}>{b.name}</div>
                    <div className="faint mono" style={{ fontSize: 12 }}>{b.id}</div>
                  </td>
                  <td className="tabnum">{b.compoundIds?.length ?? 0}</td>
                  <td className="muted" style={{ maxWidth: 280 }}>{b.tagline || '—'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className={`btn btn-sm ${b.hidden ? '' : 'btn-primary'}`}
                      onClick={() => toggle.mutate(b)}
                      disabled={toggle.isPending}
                    >
                      {b.hidden ? 'Hidden' : 'Visible'}
                    </button>
                  </td>
                  <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-sm" onClick={() => setEditing(b)}>Edit</button>{' '}
                    <button className="btn btn-danger btn-sm" onClick={() => setToDelete(b)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!blends.length && <EmptyState>No blends yet — add one.</EmptyState>}
        </div>
      )}

      {(adding || editing) && (
        <BlendForm
          blend={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['blends'] }); setAdding(false); setEditing(null) }}
        />
      )}

      {toDelete && (
        <ConfirmModal
          title="Delete this blend?"
          danger
          confirmLabel="Delete"
          busy={del.isPending}
          body={<>This removes <strong>{toDelete.name}</strong> from the server library.</>}
          onConfirm={() => del.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </Page>
  )
}

function BlendForm({ blend, onClose, onSaved }: { blend: Blend | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const editing = blend != null
  const [id, setId] = useState(blend?.id ?? '')
  const [name, setName] = useState(blend?.name ?? '')
  const [tagline, setTagline] = useState(blend?.tagline ?? '')
  const [icon, setIcon] = useState(blend?.icon ?? '')
  const [summary, setSummary] = useState(blend?.summary ?? '')
  const [rationale, setRationale] = useState(blend?.rationale ?? '')
  const [considerations, setConsiderations] = useState(listToText(blend?.considerations))
  const [picked, setPicked] = useState<string[]>(blend?.compoundIds ?? [])
  const [filter, setFilter] = useState('')

  const compoundsQ = useQuery({ queryKey: ['compounds'], queryFn: () => compoundsApi.list() })
  const compounds: Compound[] = compoundsQ.data?.compounds ?? []
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q ? compounds.filter((c) => (c.name + ' ' + c.id).toLowerCase().includes(q)) : compounds
  }, [compounds, filter])

  function togglePick(cid: string) {
    setPicked((p) => (p.includes(cid) ? p.filter((x) => x !== cid) : [...p, cid]))
  }

  const save = useMutation({
    mutationFn: () =>
      blendsApi.upsert({
        ...(blend ?? { compoundIds: [] }),
        id: id.trim(),
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        icon: icon.trim() || undefined,
        summary: summary.trim() || undefined,
        rationale: rationale.trim() || undefined,
        considerations: textToList(considerations),
        compoundIds: picked,
      }),
    onSuccess: () => { toast(editing ? 'Blend saved.' : 'Blend added.', 'ok'); onSaved() },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const canSave = id.trim() && name.trim() && !save.isPending

  return (
    <Modal title={editing ? `Edit ${blend?.name}` : 'Add blend'} onClose={onClose} wide>
      <form onSubmit={(e) => { e.preventDefault(); if (canSave) save.mutate() }}>
        <div className="grid grid-2">
          <div className="field">
            <label className="label">ID</label>
            <input className="input" placeholder="e.g. wolverine" value={id} disabled={editing} onChange={(e) => setId(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Tagline</label>
            <input className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Icon</label>
            <input className="input" placeholder="e.g. heart, sparkle, drop" value={icon} onChange={(e) => setIcon(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="label">Summary</label>
          <textarea className="textarea" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Rationale</label>
          <textarea className="textarea" value={rationale} onChange={(e) => setRationale(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Considerations (one per line or comma-separated)</label>
          <textarea className="textarea" value={considerations} onChange={(e) => setConsiderations(e.target.value)} />
        </div>

        <div className="field">
          <label className="label">Compounds in this blend ({picked.length})</label>
          <input className="input" placeholder="Filter compounds…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ marginBottom: 8 }} />
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 6 }}>
            {compoundsQ.isLoading && <div className="muted" style={{ padding: 8, fontSize: 13 }}>Loading compounds…</div>}
            {shown.map((c) => {
              const on = picked.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => togglePick(c.id)}
                  className="row gap-8"
                  style={{ width: '100%', textAlign: 'left', padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', background: on ? 'var(--surface-2)' : 'transparent' }}
                >
                  <span style={{ width: 16 }}>{on ? '✓' : ''}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{c.name}</span>
                  <span className="faint mono" style={{ fontSize: 12 }}>{c.id}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="row gap-8" style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 16 }}>
          <button type="button" className="btn" onClick={onClose} disabled={save.isPending}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add blend'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
