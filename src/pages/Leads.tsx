// LEADS — waitlist + tester pipeline. List by type, inline status changes,
// per-row notes editing, add/export, and bulk invite of selected rows.
// Reads/writes through the admin-leads function; invites via admin-invite-leads.
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi, ApiCallError } from '@/lib/api'
import type { Lead, LeadStatus, LeadType } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, Modal, useToast } from '@/components/ui'
import { fmtDate, downloadCsv } from '@/lib/format'

// The status options available depend on the lead's pipeline type.
const STATUS_BY_TYPE: Record<LeadType, LeadStatus[]> = {
  waitlist: ['waitlist', 'invited', 'converted', 'dead'],
  tester: ['applied', 'accepted', 'active', 'dropped'],
}

function statusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case 'converted':
    case 'active':
      return 'badge-green'
    case 'invited':
    case 'accepted':
      return 'badge-blue'
    case 'waitlist':
    case 'applied':
      return 'badge-amber'
    case 'dead':
    case 'dropped':
      return 'badge-red'
    default:
      return 'badge-gray'
  }
}

export function Leads() {
  const [type, setType] = useState<LeadType>('waitlist')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [notesFor, setNotesFor] = useState<Lead | null>(null)
  const toast = useToast()
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['leads', type],
    queryFn: () => leadsApi.list({ type }),
  })

  const leads = data?.leads ?? []

  // Drop any stale selections when the visible set changes (e.g. tab switch).
  const visibleIds = useMemo(() => new Set(leads.map((l) => l.id)), [leads])
  const selected = useMemo(
    () => [...selectedIds].filter((id) => visibleIds.has(id)),
    [selectedIds, visibleIds],
  )
  const allSelected = leads.length > 0 && selected.length === leads.length

  function switchType(next: LeadType) {
    if (next === type) return
    setType(next)
    setSelectedIds(new Set())
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(leads.map((l) => l.id)))
  }

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      leadsApi.update(id, { status }),
    onSuccess: () => {
      toast('Status updated.', 'ok')
      qc.invalidateQueries({ queryKey: ['leads', type] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const invite = useMutation({
    mutationFn: (ids: string[]) => leadsApi.invite(ids),
    onSuccess: (res) => {
      // The function may include a human-readable `note` alongside the counts.
      const note = (res as { note?: string }).note
      const summary = `Invited ${res.invited}, failed ${res.failed}.`
      toast(note ? `${summary} ${note}` : summary, res.failed > 0 ? 'info' : 'ok')
      setSelectedIds(new Set())
      qc.invalidateQueries({ queryKey: ['leads', type] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  function exportCsv() {
    downloadCsv(
      `bluprint-leads-${type}-${new Date().toISOString().slice(0, 10)}.csv`,
      leads.map((l) => ({
        id: l.id,
        name: l.name ?? '',
        email: l.email,
        source: l.source ?? '',
        status: l.status,
        instagram_handle: l.instagram_handle ?? '',
        type: l.type,
        created_at: l.created_at,
        invited_at: l.invited_at ?? '',
        converted_at: l.converted_at ?? '',
        notes: l.notes ?? '',
      })),
    )
  }

  return (
    <Page>
      <PageHeader
        title="Leads"
        subtitle={data ? `${leads.length} ${type === 'waitlist' ? 'waitlist' : 'tester'} leads` : 'Waitlist & tester pipeline'}
        actions={
          <>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              Add lead
            </button>
            <button className="btn" onClick={exportCsv} disabled={!leads.length}>
              Export CSV
            </button>
            <button
              className="btn"
              onClick={() => invite.mutate(selected)}
              disabled={!selected.length || invite.isPending}
            >
              {invite.isPending ? 'Inviting…' : `Invite selected${selected.length ? ` (${selected.length})` : ''}`}
            </button>
            <button className="btn" onClick={() => refetch()}>
              Refresh
            </button>
          </>
        }
      />

      <div className="row gap-8" style={{ marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${type === 'waitlist' ? 'btn-primary' : ''}`}
          onClick={() => switchType('waitlist')}
        >
          Waitlist
        </button>
        <button
          className={`btn btn-sm ${type === 'tester' ? 'btn-primary' : ''}`}
          onClick={() => switchType('tester')}
        >
          Testers
        </button>
      </div>

      {isLoading && <Loading label="Loading leads…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                      disabled={!leads.length}
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>IG handle</th>
                  <th>Created</th>
                  <th className="right">Notes</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(l.id)}
                        onChange={() => toggleOne(l.id)}
                        aria-label={`Select ${l.email}`}
                      />
                    </td>
                    <td style={{ fontWeight: 550 }}>{l.name || '—'}</td>
                    <td className="muted">{l.email}</td>
                    <td>
                      {l.source ? (
                        <span className="badge badge-gray">{l.source}</span>
                      ) : (
                        <span className="faint">—</span>
                      )}
                    </td>
                    <td>
                      <div className="row gap-8">
                        <span className={`badge ${statusBadgeClass(l.status)}`}>{l.status}</span>
                        <select
                          className="select"
                          style={{ width: 'auto', padding: '4px 8px' }}
                          value={l.status}
                          disabled={updateStatus.isPending}
                          onChange={(e) =>
                            updateStatus.mutate({ id: l.id, status: e.target.value as LeadStatus })
                          }
                        >
                          {STATUS_BY_TYPE[l.type].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="muted nowrap">
                      {l.type === 'tester' ? l.instagram_handle || '—' : <span className="faint">—</span>}
                    </td>
                    <td className="muted nowrap">{fmtDate(l.created_at)}</td>
                    <td className="right">
                      <button className="btn btn-ghost btn-sm" onClick={() => setNotesFor(l)}>
                        {l.notes ? 'Notes ✎' : 'Add note'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!leads.length && (
              <EmptyState>No {type === 'waitlist' ? 'waitlist' : 'tester'} leads yet.</EmptyState>
            )}
          </div>
        </div>
      )}

      {addOpen && <AddLeadModal type={type} onClose={() => setAddOpen(false)} />}

      {notesFor && <NotesModal lead={notesFor} onClose={() => setNotesFor(null)} />}
    </Page>
  )
}

function AddLeadModal({ type, onClose }: { type: LeadType; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')
  const [instagram, setInstagram] = useState('')
  const [notes, setNotes] = useState('')

  const create = useMutation({
    mutationFn: () =>
      leadsApi.create({
        type,
        name: name.trim() || null,
        email: email.trim(),
        source: source.trim() || null,
        instagram_handle: instagram.trim() || null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast('Lead added.', 'ok')
      qc.invalidateQueries({ queryKey: ['leads', type] })
      onClose()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const canSubmit = email.trim().length > 0 && !create.isPending

  return (
    <Modal title={`Add ${type === 'waitlist' ? 'waitlist' : 'tester'} lead`} onClose={onClose}>
      <div className="field">
        <label className="label">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
      </div>
      <div className="field">
        <label className="label">Email</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
        />
      </div>
      <div className="field">
        <label className="label">Source</label>
        <input
          className="input"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g. instagram, referral, landing page"
        />
      </div>
      <div className="field">
        <label className="label">Instagram handle</label>
        <input
          className="input"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@handle"
        />
      </div>
      <div className="field">
        <label className="label">Notes</label>
        <textarea
          className="textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering…"
        />
      </div>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose} disabled={create.isPending}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => create.mutate()} disabled={!canSubmit}>
          {create.isPending ? 'Adding…' : 'Add lead'}
        </button>
      </div>
    </Modal>
  )
}

function NotesModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [notes, setNotes] = useState(lead.notes ?? '')

  const save = useMutation({
    mutationFn: () => leadsApi.update(lead.id, { notes: notes.trim() || null }),
    onSuccess: () => {
      toast('Notes saved.', 'ok')
      qc.invalidateQueries({ queryKey: ['leads', lead.type] })
      onClose()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  return (
    <Modal title={`Notes — ${lead.name || lead.email}`} onClose={onClose}>
      <div className="field">
        <label className="label">Notes</label>
        <textarea
          className="textarea"
          style={{ minHeight: 140 }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering…"
        />
      </div>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose} disabled={save.isPending}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </Modal>
  )
}
