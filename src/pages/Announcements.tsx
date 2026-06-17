// ANNOUNCEMENTS — in-app announcements CMS. Create / edit / delete the
// banners shown to a segment of users within an optional time window.
// "Live" = active AND the current time falls inside [starts_at, ends_at]
// (either bound omitted ⇒ open-ended on that side).
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { announcementsApi, ApiCallError } from '@/lib/api'
import type { Announcement, Segment } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, Modal, ConfirmModal, useToast } from '@/components/ui'
import { fmtDateTime } from '@/lib/format'

const SEGMENTS: Segment[] = ['all', 'free', 'trial', 'premium']

function segmentBadge(segment: Segment) {
  const cls =
    segment === 'premium'
      ? 'badge-purple'
      : segment === 'trial'
        ? 'badge-amber'
        : segment === 'free'
          ? 'badge-gray'
          : 'badge-blue'
  return <span className={`badge ${cls}`}>{segment}</span>
}

/** Live = active AND now is within [starts_at, ends_at] (open-ended bounds ok). */
function isLive(a: Announcement): boolean {
  if (!a.active) return false
  const now = Date.now()
  if (a.starts_at) {
    const s = new Date(a.starts_at).getTime()
    if (!isNaN(s) && now < s) return false
  }
  if (a.ends_at) {
    const e = new Date(a.ends_at).getTime()
    if (!isNaN(e) && now > e) return false
  }
  return true
}

export function Announcements() {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDel, setConfirmDel] = useState<Announcement | null>(null)
  const toast = useToast()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsApi.list(),
  })

  const list = data?.announcements ?? []

  const del = useMutation({
    mutationFn: (id: string) => announcementsApi.remove(id),
    onSuccess: () => {
      toast('Announcement deleted.', 'ok')
      qc.invalidateQueries({ queryKey: ['announcements'] })
      setConfirmDel(null)
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  return (
    <Page>
      <PageHeader
        title="Announcements"
        subtitle={data ? `${list.length} announcement${list.length === 1 ? '' : 's'}` : 'In-app banners by segment'}
        actions={
          <>
            <button className="btn" onClick={() => refetch()}>
              Refresh
            </button>
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              New announcement
            </button>
          </>
        }
      />

      {isLoading && <Loading label="Loading announcements…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && !list.length && (
        <EmptyState>No announcements yet. Create one to greet a segment of users in-app.</EmptyState>
      )}

      {data && list.length > 0 && (
        <div className="grid">
          {list.map((a) => {
            const live = isLive(a)
            return (
              <div key={a.id} className="card">
                <div className="row between" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row gap-8 wrap" style={{ marginBottom: 6 }}>
                      <strong style={{ fontSize: 15 }}>{a.title || 'Untitled'}</strong>
                      {segmentBadge(a.segment)}
                      <span className={`badge ${live ? 'badge-green' : 'badge-gray'}`}>
                        {live ? 'Live' : 'Inactive'}
                      </span>
                    </div>
                    <div
                      className="muted"
                      style={{
                        fontSize: 13,
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {a.body || <span className="faint">No body.</span>}
                    </div>
                    <div className="faint nowrap" style={{ fontSize: 12, marginTop: 10 }}>
                      {a.starts_at || a.ends_at ? (
                        <>
                          {fmtDateTime(a.starts_at) || '—'}
                          {' → '}
                          {a.ends_at ? fmtDateTime(a.ends_at) : 'no end'}
                        </>
                      ) : (
                        'No window set — always on while active'
                      )}
                    </div>
                  </div>
                  <div className="row gap-8" style={{ flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => setEditing(a)}>
                      Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(a)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(creating || editing) && (
        <AnnouncementModal
          announcement={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['announcements'] })
            setCreating(false)
            setEditing(null)
          }}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          title="Delete this announcement?"
          danger
          confirmLabel="Delete"
          busy={del.isPending}
          body={
            <>
              This permanently removes <strong>{confirmDel.title || 'this announcement'}</strong>. Users in the{' '}
              <strong>{confirmDel.segment}</strong> segment will no longer see it. This cannot be undone.
            </>
          }
          onConfirm={() => del.mutate(confirmDel.id)}
          onClose={() => setConfirmDel(null)}
        />
      )}
    </Page>
  )
}

// datetime-local inputs work in local-time "YYYY-MM-DDTHH:mm". Convert to/from
// the ISO strings the API stores.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(local: string): string | null {
  if (!local.trim()) return null
  const d = new Date(local)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}

function AnnouncementModal({
  announcement,
  onClose,
  onSaved,
}: {
  announcement: Announcement | null
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const editingId = announcement?.id ?? null

  const [title, setTitle] = useState(announcement?.title ?? '')
  const [body, setBody] = useState(announcement?.body ?? '')
  const [segment, setSegment] = useState<Segment>(announcement?.segment ?? 'all')
  const [active, setActive] = useState(announcement?.active ?? true)
  const [startsAt, setStartsAt] = useState(isoToLocalInput(announcement?.starts_at ?? null))
  const [endsAt, setEndsAt] = useState(isoToLocalInput(announcement?.ends_at ?? null))

  const save = useMutation({
    mutationFn: () => {
      const patch: Partial<Announcement> = {
        title: title.trim(),
        body: body.trim(),
        segment,
        active,
        starts_at: localInputToIso(startsAt),
        ends_at: localInputToIso(endsAt),
      }
      return editingId ? announcementsApi.update(editingId, patch) : announcementsApi.create(patch)
    },
    onSuccess: () => {
      toast(editingId ? 'Announcement updated.' : 'Announcement created.', 'ok')
      onSaved()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const canSave = title.trim().length > 0 && body.trim().length > 0 && !save.isPending

  return (
    <Modal title={editingId ? 'Edit announcement' : 'New announcement'} onClose={onClose}>
      <div className="field">
        <label className="label">Title</label>
        <input
          className="input"
          placeholder="e.g. New protocols are live"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label">Body</label>
        <textarea
          className="textarea"
          placeholder="What you want this segment to see…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="label">Segment</label>
        <select className="select" value={segment} onChange={(e) => setSegment(e.target.value as Segment)}>
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All users' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-2">
        <div className="field">
          <label className="label">Starts at (optional)</label>
          <input
            className="input"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label">Ends at (optional)</label>
          <input
            className="input"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label className="row gap-8" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span>Active</span>
          <span className="faint" style={{ fontSize: 12 }}>
            (only active announcements within their window go live)
          </span>
        </label>
      </div>

      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose} disabled={save.isPending}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => save.mutate()} disabled={!canSave}>
          {save.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
        </button>
      </div>
    </Modal>
  )
}
