// PUSH — compose & send a push notification to a segment (or one user), and
// review the send history. Sends go through the admin-send-push function, which
// fans out over registered Expo tokens. Targeting a specific user id overrides
// the segment. See note in the Compose card re: token registration + 'trial'.
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pushApi, ApiCallError } from '@/lib/api'
import type { PushLogEntry, Segment } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, ConfirmModal, useToast } from '@/components/ui'
import { fmtDateTime } from '@/lib/format'

const SEGMENTS: { value: Segment; label: string }[] = [
  { value: 'all', label: 'All users' },
  { value: 'free', label: 'Free' },
  { value: 'trial', label: 'Trial (best-effort)' },
  { value: 'premium', label: 'Premium' },
]

function segmentBadge(segment: Segment) {
  const cls: Record<Segment, string> = {
    all: 'badge-blue',
    free: 'badge-gray',
    trial: 'badge-amber',
    premium: 'badge-green',
  }
  return <span className={`badge ${cls[segment]}`}>{segment}</span>
}

export function Push() {
  const qc = useQueryClient()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [segment, setSegment] = useState<Segment>('all')
  const [userId, setUserId] = useState('')
  const [confirmAll, setConfirmAll] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['push-history'],
    queryFn: () => pushApi.history(),
  })

  const log = data?.log ?? []
  const targetUserId = userId.trim()
  const canSend = title.trim().length > 0 && body.trim().length > 0

  const send = useMutation({
    mutationFn: () =>
      pushApi.send({
        title: title.trim(),
        body: body.trim(),
        segment,
        userId: targetUserId || undefined,
      }),
    onSuccess: (res) => {
      toast(`Sent ${res.ok}/${res.sent} (${res.errors} errors)`, res.errors ? 'info' : 'ok')
      setTitle('')
      setBody('')
      qc.invalidateQueries({ queryKey: ['push-history'] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  // Sending to a specific user is targeted; otherwise confirm before blasting 'all'.
  function attemptSend() {
    if (!canSend || send.isPending) return
    if (!targetUserId && segment === 'all') {
      setConfirmAll(true)
      return
    }
    send.mutate()
  }

  return (
    <Page>
      <PageHeader
        title="Push"
        subtitle="Send a push notification to a segment or a single user"
        actions={
          <button className="btn" onClick={() => refetch()}>
            Refresh
          </button>
        }
      />

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">Compose</div>

          <div className="field">
            <label className="label">Title</label>
            <input
              className="input"
              placeholder="e.g. New protocol drop"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Body</label>
            <textarea
              className="textarea"
              placeholder="What the notification says…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="label">Segment</label>
            <select
              className="select"
              value={segment}
              onChange={(e) => setSegment(e.target.value as Segment)}
              disabled={!!targetUserId}
            >
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label">Specific user id (optional — overrides segment)</label>
            <input
              className="input mono"
              placeholder="e.g. 8f3c…  (leave blank to use segment)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={attemptSend}
            disabled={!canSend || send.isPending}
          >
            {send.isPending
              ? 'Sending…'
              : targetUserId
                ? 'Send to user'
                : `Send to ${SEGMENTS.find((s) => s.value === segment)?.label ?? segment}`}
          </button>

          <p className="faint" style={{ fontSize: 12, lineHeight: 1.6, marginTop: 14, marginBottom: 0 }}>
            Push requires the app to register Expo tokens (the admin-integration app change). Users without a
            registered token won't receive anything. Segment <span className="mono">trial</span> is best-effort —
            trial membership is approximate.
          </p>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-title" style={{ padding: '18px 18px 0' }}>
            History
          </div>

          {isLoading && <Loading label="Loading history…" />}
          {error && (
            <div style={{ padding: 18 }}>
              <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />
            </div>
          )}

          {data && (
            <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Sent</th>
                    <th>Title</th>
                    <th>Segment</th>
                    <th>Target</th>
                    <th className="right">Sent / OK / Err</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((entry: PushLogEntry) => (
                    <tr key={entry.id}>
                      <td className="muted nowrap">{fmtDateTime(entry.created_at)}</td>
                      <td>
                        <div style={{ fontWeight: 550 }}>{entry.title || '—'}</div>
                        <div className="faint" style={{ fontSize: 12 }}>
                          {entry.body}
                        </div>
                      </td>
                      <td>{segmentBadge(entry.segment)}</td>
                      <td>
                        {entry.target_user_id ? (
                          <span className="mono">{entry.target_user_id}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="right nowrap tabnum">
                        {entry.sent_count}
                        <span className="faint"> / </span>
                        <span style={{ color: 'var(--green)' }}>{entry.ok_count}</span>
                        <span className="faint"> / </span>
                        <span style={{ color: entry.error_count ? 'var(--red)' : undefined }}>
                          {entry.error_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!log.length && <EmptyState>No pushes sent yet.</EmptyState>}
            </div>
          )}
        </div>
      </div>

      {confirmAll && (
        <ConfirmModal
          title="Send to all users?"
          confirmLabel="Send to everyone"
          busy={send.isPending}
          body={
            <>
              This sends “<strong>{title.trim()}</strong>” to <strong>every</strong> user with a registered push
              token. There's no undo once it's out.
            </>
          }
          onConfirm={() => {
            setConfirmAll(false)
            send.mutate()
          }}
          onClose={() => setConfirmAll(false)}
        />
      )}
    </Page>
  )
}
