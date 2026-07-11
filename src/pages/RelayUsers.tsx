// RELAY — users. Every Relay customer + entitlement, with per-user GDPR erasure that deletes ONLY the
// relay_* rows (never the shared account / fitness data). admin-relay-users + admin-relay-delete-user.
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { relayApi, ApiCallError } from '@/lib/api'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, ConfirmModal, useToast } from '@/components/ui'
import { fmtDate, downloadCsv } from '@/lib/format'
import type { RelayUser } from '@/types'

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--green)',
  trialing: 'var(--blue)',
  past_due: 'var(--amber)',
  canceled: 'var(--red)',
  expired: 'var(--text-faint)',
  none: 'var(--text-faint)',
}
function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || 'var(--text-faint)'
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 12, color: c, background: 'color-mix(in srgb, currentColor 14%, transparent)' }}>
      {status}
    </span>
  )
}

export function RelayUsers() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['relay', 'users'], queryFn: () => relayApi.users({ limit: 1000 }) })
  const [deleting, setDeleting] = useState<RelayUser | null>(null)

  const del = useMutation({
    mutationFn: (u: RelayUser) => relayApi.deleteUser(u.user_id, 'admin console'),
    onSuccess: () => {
      toast('Relay data erased.', 'ok')
      setDeleting(null)
      qc.invalidateQueries({ queryKey: ['relay'] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const users = data?.users ?? []
  const exportCsv = () =>
    downloadCsv(
      'relay-users.csv',
      users.map((u) => ({
        user_id: u.user_id,
        status: u.status,
        plan: u.plan ?? '',
        marketing_opt_in: u.marketing_opt_in ? 'yes' : 'no',
        current_period_end: u.current_period_end ?? '',
        created_at: u.created_at,
      })),
    )

  return (
    <Page>
      <PageHeader
        title="Relay · Users"
        subtitle="Every customer + entitlement · GDPR erasure per user"
        actions={
          <div className="row gap-8">
            <button className="btn" onClick={exportCsv} disabled={!users.length}>
              Export CSV
            </button>
            <button className="btn" onClick={() => refetch()}>
              Refresh
            </button>
          </div>
        }
      />

      {isLoading && <Loading label="Loading users…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {!isLoading &&
        (users.length ? (
          <div className="card">
            <div className="card-title">{users.length} users</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th>Marketing</th>
                    <th className="nowrap">Renews</th>
                    <th className="nowrap">Joined</th>
                    <th className="right"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id}>
                      <td className="mono" style={{ fontSize: 12 }}>{u.user_id.slice(0, 8)}…</td>
                      <td><StatusPill status={u.status} /></td>
                      <td>{u.plan ?? '—'}</td>
                      <td>{u.marketing_opt_in ? 'opted in' : <span className="faint">—</span>}</td>
                      <td className="nowrap">{fmtDate(u.current_period_end)}</td>
                      <td className="nowrap">{fmtDate(u.created_at)}</td>
                      <td className="right">
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleting(u)}>
                          Erase
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState>No Relay users yet.</EmptyState>
        ))}

      {deleting && (
        <ConfirmModal
          title="Erase this user’s Relay data?"
          confirmLabel="Erase Relay data"
          danger
          busy={del.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => del.mutate(deleting)}
          body={
            <p>
              Permanently deletes ALL Relay data for <span className="mono">{deleting.user_id.slice(0, 8)}…</span>{' '}
              (customer, entitlement, devices, subscription events, keys, consent). Their shared account and the
              fitness app’s data are <b>not</b> touched. This can’t be undone.
            </p>
          }
        />
      )}
    </Page>
  )
}
