// RELAY — subscribers. The full entitlement list, filterable by status, with CSV export.
// admin-relay-subscribers.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { relayApi, ApiCallError } from '@/lib/api'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner } from '@/components/ui'
import { fmtDate, downloadCsv } from '@/lib/format'

const STATUS_COLOR: Record<string, string> = {
  active: 'var(--green)',
  trialing: 'var(--blue)',
  past_due: 'var(--amber)',
  canceled: 'var(--red)',
  expired: 'var(--text-faint)',
}
function StatusPill({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || 'var(--text-faint)'
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 12, color: c, background: 'color-mix(in srgb, currentColor 14%, transparent)' }}>
      {status}
    </span>
  )
}

const FILTERS = ['all', 'active', 'trialing', 'past_due', 'canceled', 'expired'] as const

export function RelaySubscribers() {
  const [status, setStatus] = useState<string>('all')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['relay', 'subscribers', 'full', status],
    queryFn: () => relayApi.subscribers({ status: status === 'all' ? undefined : status, limit: 2000 }),
  })
  const subscribers = data?.subscribers ?? []

  const exportCsv = () =>
    downloadCsv(
      `relay-subscribers${status === 'all' ? '' : '-' + status}.csv`,
      subscribers.map((s) => ({
        user_id: s.user_id,
        status: s.status,
        plan: s.plan ?? '',
        source: s.source ?? '',
        current_period_end: s.current_period_end ?? '',
        paddle_subscription_id: s.paddle_subscription_id ?? '',
        updated_at: s.updated_at,
        created_at: s.created_at ?? '',
      })),
    )

  return (
    <Page>
      <PageHeader
        title="Relay · Subscribers"
        subtitle="Every entitlement, filterable by status"
        actions={
          <div className="row gap-8">
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 'auto' }}>
              {FILTERS.map((f) => (
                <option key={f} value={f}>
                  {f === 'all' ? 'All statuses' : f}
                </option>
              ))}
            </select>
            <button className="btn" onClick={exportCsv} disabled={!subscribers.length}>
              Export CSV
            </button>
            <button className="btn" onClick={() => refetch()}>
              Refresh
            </button>
          </div>
        }
      />

      {isLoading && <Loading label="Loading subscribers…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {!isLoading &&
        (subscribers.length ? (
          <div className="card">
            <div className="card-title">
              {subscribers.length} {status === 'all' ? 'subscribers' : status}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th>Source</th>
                    <th className="nowrap">Renews</th>
                    <th className="nowrap">Joined</th>
                    <th>Subscription</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((s) => (
                    <tr key={s.user_id}>
                      <td className="mono" style={{ fontSize: 12 }}>{s.user_id.slice(0, 8)}…</td>
                      <td><StatusPill status={s.status} /></td>
                      <td>{s.plan ?? '—'}</td>
                      <td>{s.source ?? '—'}</td>
                      <td className="nowrap">{fmtDate(s.current_period_end)}</td>
                      <td className="nowrap">{fmtDate(s.created_at)}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{s.paddle_subscription_id ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState>No subscribers{status !== 'all' ? ` with status “${status}”` : ''} yet.</EmptyState>
        ))}
    </Page>
  )
}
