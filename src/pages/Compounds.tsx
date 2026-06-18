// COMPOUNDS — CMS for the in-app compound library. Reads the server table via
// the admin-compounds function; when no rows exist yet (source === 'empty')
// the app falls back to its bundled compounds.js, so we nudge to seed first.
// Founders can add/edit compounds, toggle visibility, and delete.
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { compoundsApi, compoundSuggestApi, ApiCallError } from '@/lib/api'
import type { Compound, ResearchBadge } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, Modal, ConfirmModal, useToast } from '@/components/ui'

const RESEARCH_BADGES: ResearchBadge[] = [
  'Preclinical',
  'Early Clinical',
  'Clinical',
  'FDA Approved',
  'Dev Abandoned',
]

function researchBadgeClass(badge: string | undefined): string {
  switch (badge) {
    case 'FDA Approved':
      return 'badge-green'
    case 'Clinical':
      return 'badge-blue'
    case 'Early Clinical':
      return 'badge-amber'
    case 'Preclinical':
      return 'badge-gray'
    case 'Dev Abandoned':
      return 'badge-red'
    default:
      return 'badge-gray'
  }
}

// string[] <-> textarea. Splits on newlines or commas; trims; drops blanks.
function listToText(list: string[] | undefined): string {
  return (list ?? []).join('\n')
}
function textToList(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function Compounds() {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Compound | null>(null)
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<Compound | null>(null)
  const qc = useQueryClient()
  const toast = useToast()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['compounds'],
    queryFn: () => compoundsApi.list(),
  })

  const compounds = data?.compounds ?? []
  const isEmptySource = data?.source === 'empty'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return compounds
    return compounds.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.id?.toLowerCase().includes(q) ||
        c.primaryCategory?.toLowerCase().includes(q) ||
        c.oneLiner?.toLowerCase().includes(q) ||
        c.aka?.some((a) => a.toLowerCase().includes(q)),
    )
  }, [compounds, search])

  const toggle = useMutation({
    mutationFn: (c: Compound) => compoundsApi.toggle(c.id, !c.hidden),
    onSuccess: (_res, c) => {
      toast(c.hidden ? 'Compound shown.' : 'Compound hidden.', 'ok')
      qc.invalidateQueries({ queryKey: ['compounds'] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const del = useMutation({
    mutationFn: (id: string) => compoundsApi.remove(id),
    onSuccess: () => {
      toast('Compound deleted.', 'ok')
      qc.invalidateQueries({ queryKey: ['compounds'] })
      setToDelete(null)
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  return (
    <Page>
      <PageHeader
        title="Compounds"
        subtitle={data ? `${compounds.length} compounds` : 'In-app compound library'}
        actions={
          <>
            <input
              className="input"
              style={{ width: 260 }}
              placeholder="Search name, id, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              Add compound
            </button>
            <button className="btn" onClick={() => refetch()}>
              Refresh
            </button>
          </>
        }
      />

      {isLoading && <Loading label="Loading compounds…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && isEmptySource && (
        <div className="card" style={{ borderColor: 'var(--blue)', background: 'var(--blue-dim)', marginBottom: 14 }}>
          <div className="card-title" style={{ color: 'var(--blue)' }}>
            No server compounds yet
          </div>
          <p className="muted" style={{ margin: 0, lineHeight: 1.6, fontSize: 13 }}>
            The app is using its bundled <span className="mono">compounds.js</span> fallback. Seed the table to
            start editing (see <span className="mono">scripts/seed-compounds.md</span>). You can still add a
            compound below.
          </p>
        </div>
      )}

      {data && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ maxHeight: 'calc(100vh - 230px)', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Research</th>
                  <th>Visible</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="row-click" onClick={() => setEditing(c)}>
                    <td>
                      <div style={{ fontWeight: 550 }}>{c.name || c.id}</div>
                      {c.oneLiner && (
                        <div className="faint" style={{ fontSize: 12 }}>
                          {c.oneLiner}
                        </div>
                      )}
                    </td>
                    <td className="muted">{c.primaryCategory || '—'}</td>
                    <td>
                      {c.researchStatusBadge ? (
                        <span className={`badge ${researchBadgeClass(c.researchStatusBadge)}`}>
                          {c.researchStatusBadge}
                        </span>
                      ) : (
                        <span className="faint">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${c.hidden ? '' : 'btn-primary'}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggle.mutate(c)
                        }}
                        disabled={toggle.isPending}
                      >
                        {c.hidden ? 'Hidden' : 'Visible'}
                      </button>
                    </td>
                    <td className="right nowrap" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-sm" onClick={() => setEditing(c)}>
                        Edit
                      </button>{' '}
                      <button className="btn btn-danger btn-sm" onClick={() => setToDelete(c)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <EmptyState>
                {search ? `No compounds match “${search}”.` : 'No compounds yet — add the first one.'}
              </EmptyState>
            )}
          </div>
        </div>
      )}

      {(adding || editing) && (
        <CompoundForm
          compound={editing}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['compounds'] })
            setAdding(false)
            setEditing(null)
          }}
        />
      )}

      {toDelete && (
        <ConfirmModal
          title="Delete this compound?"
          danger
          confirmLabel="Delete"
          busy={del.isPending}
          body={
            <>
              This removes <strong>{toDelete.name || toDelete.id}</strong> from the server library. The app falls
              back to the bundled copy (if one exists) until you re-add it.
            </>
          }
          onConfirm={() => del.mutate(toDelete.id)}
          onClose={() => setToDelete(null)}
        />
      )}
    </Page>
  )
}

function CompoundForm({
  compound,
  onClose,
  onSaved,
}: {
  compound: Compound | null
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const editing = compound != null

  const [id, setId] = useState(compound?.id ?? '')
  const [name, setName] = useState(compound?.name ?? '')
  const [primaryCategory, setPrimaryCategory] = useState(compound?.primaryCategory ?? '')
  const [researchStatusBadge, setResearchStatusBadge] = useState<string>(compound?.researchStatusBadge ?? '')
  const [oneLiner, setOneLiner] = useState(compound?.oneLiner ?? '')
  const [legalStatus, setLegalStatus] = useState(compound?.legalStatus ?? '')
  const [whatItIs, setWhatItIs] = useState(compound?.whatItIs ?? '')
  const [howItWorks, setHowItWorks] = useState(compound?.howItWorks ?? '')
  const [benefits, setBenefits] = useState(listToText(compound?.benefits))
  const [sideEffects, setSideEffects] = useState(listToText(compound?.sideEffects))
  const [categories, setCategories] = useState(listToText(compound?.categories))
  const [aka, setAka] = useState(listToText(compound?.aka))
  const [sequence, setSequence] = useState(compound?.sequence ?? '')
  const [molecularFormula, setMolecularFormula] = useState(compound?.molecularFormula ?? '')
  // Holds fields the AI fills that the form doesn't surface (researchStatusFull,
  // wada, residues, researchedAlongside, nonPeptide) so they persist on save.
  const [extra, setExtra] = useState<Partial<Compound>>(compound ?? {})
  const [suggestName, setSuggestName] = useState(compound?.name ?? '')
  const [suggestModel, setSuggestModel] = useState('claude-sonnet-4-6')

  const suggest = useMutation({
    mutationFn: () => compoundSuggestApi.suggest(suggestName.trim(), suggestModel),
    onSuccess: ({ draft }) => {
      if (!editing && draft.id) setId(draft.id)
      if (draft.name) setName(draft.name)
      setPrimaryCategory(draft.primaryCategory ?? '')
      setResearchStatusBadge((draft.researchStatusBadge as string) ?? '')
      setOneLiner(draft.oneLiner ?? '')
      setLegalStatus(draft.legalStatus ?? '')
      setWhatItIs(draft.whatItIs ?? '')
      setHowItWorks(draft.howItWorks ?? '')
      setBenefits(listToText(draft.benefits))
      setSideEffects(listToText(draft.sideEffects))
      setCategories(listToText(draft.categories))
      setAka(listToText(draft.aka))
      setSequence(draft.sequence ?? '')
      setMolecularFormula(draft.molecularFormula ?? '')
      setExtra({
        researchStatusFull: draft.researchStatusFull,
        wada: draft.wada,
        residues: draft.residues,
        researchedAlongside: draft.researchedAlongside,
        nonPeptide: draft.nonPeptide,
      })
      toast('AI draft filled in — review and edit before saving.', 'ok')
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const save = useMutation({
    mutationFn: () => {
      const next: Compound = {
        // preserve any fields we don't surface in the form, plus AI-filled extras
        ...(compound ?? {}),
        ...extra,
        id: id.trim(),
        name: name.trim(),
        primaryCategory: primaryCategory.trim() || undefined,
        researchStatusBadge: researchStatusBadge || undefined,
        oneLiner: oneLiner.trim() || undefined,
        legalStatus: legalStatus.trim() || undefined,
        whatItIs: whatItIs.trim() || undefined,
        howItWorks: howItWorks.trim() || undefined,
        benefits: textToList(benefits),
        sideEffects: textToList(sideEffects),
        categories: textToList(categories),
        aka: textToList(aka),
        sequence: sequence.trim() || undefined,
        molecularFormula: molecularFormula.trim() || undefined,
      }
      return compoundsApi.upsert(next)
    },
    onSuccess: () => {
      toast(editing ? 'Compound saved.' : 'Compound added.', 'ok')
      onSaved()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const canSave = id.trim().length > 0 && name.trim().length > 0 && !save.isPending

  return (
    <Modal title={editing ? `Edit ${compound?.name || compound?.id}` : 'Add compound'} onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSave) save.mutate()
        }}
      >
        {/* AI draft — fills every field below from the model's knowledge. */}
        <div className="card" style={{ marginBottom: 14, background: 'var(--surface-2)' }}>
          <div className="row gap-8 wrap" style={{ alignItems: 'flex-end' }}>
            <div className="field grow" style={{ marginBottom: 0, minWidth: 200 }}>
              <label className="label">Draft with AI</label>
              <input
                className="input"
                placeholder="Compound name, e.g. MOTS-c"
                value={suggestName}
                onChange={(e) => setSuggestName(e.target.value)}
              />
            </div>
            <select className="select" value={suggestModel} onChange={(e) => setSuggestModel(e.target.value)} style={{ width: 'auto' }}>
              <option value="claude-haiku-4-5">Haiku</option>
              <option value="claude-sonnet-4-6">Sonnet</option>
              <option value="claude-opus-4-8">Opus</option>
            </select>
            <button
              type="button"
              className="btn btn-gradient"
              onClick={() => suggest.mutate()}
              disabled={suggest.isPending || !suggestName.trim()}
            >
              {suggest.isPending ? 'Drafting…' : 'Suggest with AI'}
            </button>
          </div>
          <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>
            Fills every field below from Claude's knowledge (incl. amino-acid sequence + formula). Review and edit before
            saving — it's a draft, not gospel.
          </div>
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label className="label">ID</label>
            <input
              className="input"
              placeholder="e.g. bpc-157"
              value={id}
              disabled={editing}
              onChange={(e) => setId(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Primary category</label>
            <input
              className="input"
              placeholder="e.g. Peptide"
              value={primaryCategory}
              onChange={(e) => setPrimaryCategory(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">Research status</label>
            <select
              className="select"
              value={researchStatusBadge}
              onChange={(e) => setResearchStatusBadge(e.target.value)}
            >
              <option value="">—</option>
              {RESEARCH_BADGES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label">One-liner</label>
          <input className="input" value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} />
        </div>

        <div className="field">
          <label className="label">Legal status</label>
          <input className="input" value={legalStatus} onChange={(e) => setLegalStatus(e.target.value)} />
        </div>

        <div className="field">
          <label className="label">What it is</label>
          <textarea className="textarea" value={whatItIs} onChange={(e) => setWhatItIs(e.target.value)} />
        </div>

        <div className="field">
          <label className="label">How it works</label>
          <textarea className="textarea" value={howItWorks} onChange={(e) => setHowItWorks(e.target.value)} />
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label className="label">Amino-acid sequence</label>
            <input className="input mono" placeholder="Gly-Glu-Pro-…" value={sequence} onChange={(e) => setSequence(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Molecular formula</label>
            <input className="input mono" placeholder="C62H98N16O22" value={molecularFormula} onChange={(e) => setMolecularFormula(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-2">
          <div className="field">
            <label className="label">Benefits (one per line or comma-separated)</label>
            <textarea className="textarea" value={benefits} onChange={(e) => setBenefits(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Side effects (one per line or comma-separated)</label>
            <textarea className="textarea" value={sideEffects} onChange={(e) => setSideEffects(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Categories (one per line or comma-separated)</label>
            <textarea className="textarea" value={categories} onChange={(e) => setCategories(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Also known as (one per line or comma-separated)</label>
            <textarea className="textarea" value={aka} onChange={(e) => setAka(e.target.value)} />
          </div>
        </div>

        <div
          className="row gap-8"
          style={{ justifyContent: 'flex-end', borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 16 }}
        >
          <button type="button" className="btn" onClick={onClose} disabled={save.isPending}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Add compound'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
