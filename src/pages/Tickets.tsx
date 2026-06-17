// TICKETS (V2) — support inbox. List + status-filter tabs, a wide detail modal
// with the message thread, status/priority controls, and a reply box (with an
// internal-note option). Mirrors the structure/style of Users.tsx.
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ticketsApi, ApiCallError } from '@/lib/api'
import type { TicketMessage, TicketStatus, TicketPriority } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, Modal, useToast } from '@/components/ui'
import { fmtDateTime, fmtRelative } from '@/lib/format'

// 'All' maps to an undefined status arg; the rest pass through to the function.
const TABS: { label: string; value: TicketStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
]

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
]

function statusBadge(status: TicketStatus) {
  const cls =
    status === 'open'
      ? 'badge-blue'
      : status === 'in_progress'
        ? 'badge-amber'
        : status === 'resolved'
          ? 'badge-green'
          : 'badge-gray'
  const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status
  return <span className={`badge ${cls}`}>{label}</span>
}

function priorityBadge(priority: TicketPriority) {
  return (
    <span className={`badge ${priority === 'urgent' ? 'badge-red' : 'badge-gray'}`}>
      {priority === 'urgent' ? 'urgent' : 'normal'}
    </span>
  )
}

export function Tickets() {
  const [tab, setTab] = useState<TicketStatus | undefined>(undefined)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tickets', tab],
    queryFn: () => ticketsApi.list(tab),
  })

  const tickets = data?.tickets ?? []
  const openCount = data?.openCount ?? 0

  return (
    <Page>
      <PageHeader
        title="Support"
        subtitle={data ? `${openCount} open` : 'Support tickets'}
        actions={
          <button className="btn" onClick={() => refetch()}>
            Refresh
          </button>
        }
      />

      <div className="row gap-8 wrap" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.label}
            className={`btn btn-sm ${tab === t.value ? 'btn-primary' : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <Loading label="Loading tickets…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>User</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th className="right">Messages</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="row-click" onClick={() => setSelectedId(t.id)}>
                    <td>
                      <div style={{ fontWeight: 550 }}>{t.subject || '—'}</div>
                      <div className="faint" style={{ fontSize: 12 }}>
                        {fmtRelative(t.created_at)}
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: 12 }}>
                        {t.email || t.user_id || '—'}
                      </span>
                    </td>
                    <td>{priorityBadge(t.priority)}</td>
                    <td>{statusBadge(t.status)}</td>
                    <td className="right tabnum muted">{t.messageCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!tickets.length && <EmptyState>No tickets here yet.</EmptyState>}
          </div>
        </div>
      )}

      {selectedId && (
        <TicketDetail
          ticketId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => qc.invalidateQueries({ queryKey: ['tickets', tab] })}
        />
      )}
    </Page>
  )
}

function TicketDetail({
  ticketId,
  onClose,
  onChanged,
}: {
  ticketId: string
  onClose: () => void
  onChanged: () => void
}) {
  const toast = useToast()
  const qc = useQueryClient()
  const [reply, setReply] = useState('')
  const [internal, setInternal] = useState(false)

  const detailKey = ['ticket', ticketId]
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: detailKey,
    queryFn: () => ticketsApi.get(ticketId),
  })

  const ticket = data?.ticket
  const messages = data?.messages ?? []

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: detailKey })
    onChanged()
  }

  const statusMut = useMutation({
    mutationFn: (status: TicketStatus) => ticketsApi.setStatus(ticketId, status),
    onSuccess: () => {
      toast('Status updated.', 'ok')
      refreshAll()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const priorityMut = useMutation({
    mutationFn: (priority: TicketPriority) => ticketsApi.setPriority(ticketId, priority),
    onSuccess: () => {
      toast('Priority updated.', 'ok')
      refreshAll()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const replyMut = useMutation({
    mutationFn: () => ticketsApi.reply(ticketId, reply.trim(), internal),
    onSuccess: () => {
      toast(internal ? 'Internal note added.' : 'Reply sent.', 'ok')
      setReply('')
      setInternal(false)
      refreshAll()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  return (
    <Modal title={ticket?.subject || 'Ticket'} onClose={onClose} wide>
      {isLoading && <Loading label="Loading ticket…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {ticket && (
        <>
          <div className="row gap-16 wrap between" style={{ marginBottom: 16 }}>
            <div className="faint" style={{ fontSize: 12 }}>
              {ticket.email || ticket.user_id || 'unknown user'} · opened {fmtRelative(ticket.created_at)}
            </div>
            <div className="row gap-12 wrap">
              <div className="field" style={{ margin: 0 }}>
                <label className="label">Status</label>
                <select
                  className="select"
                  value={ticket.status}
                  disabled={statusMut.isPending}
                  onChange={(e) => statusMut.mutate(e.target.value as TicketStatus)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label className="label">Priority</label>
                <select
                  className="select"
                  value={ticket.priority}
                  disabled={priorityMut.isPending}
                  onChange={(e) => priorityMut.mutate(e.target.value as TicketPriority)}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid var(--border)',
              paddingTop: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxHeight: 'calc(100vh - 420px)',
              overflowY: 'auto',
            }}
          >
            {messages.length ? (
              messages.map((m) => <MessageRow key={m.id} message={m} />)
            ) : (
              <EmptyState>No messages yet.</EmptyState>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
            <div className="field">
              <label className="label">Reply</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder={internal ? 'Internal note (not visible to the user)…' : 'Write a reply…'}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
            </div>
            <div className="row between wrap gap-8">
              <label className="row gap-8" style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                Internal note
              </label>
              <button
                className="btn btn-primary"
                onClick={() => replyMut.mutate()}
                disabled={replyMut.isPending || !reply.trim()}
              >
                {replyMut.isPending ? 'Sending…' : internal ? 'Add note' : 'Send'}
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}

function MessageRow({ message }: { message: TicketMessage }) {
  const isAdmin = message.author === 'admin'
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 12,
        background: 'var(--surface)',
      }}
    >
      <div className="row gap-8 between" style={{ marginBottom: 6 }}>
        <div className="row gap-8">
          <span className={`badge ${isAdmin ? 'badge-blue' : 'badge-gray'}`}>{isAdmin ? 'admin' : 'user'}</span>
          {message.internal && <span className="badge badge-amber">internal</span>}
        </div>
        <span className="faint" style={{ fontSize: 12 }}>
          {fmtDateTime(message.created_at)}
        </span>
      </div>
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{message.body}</div>
    </div>
  )
}
