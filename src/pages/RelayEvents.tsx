// RELAY — billing activity log. The raw relay_subscription_events feed (activated / renewed / canceled /
// past_due / refunded / chargeback), filterable by type, with CSV export. admin-relay-events.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { relayApi, ApiCallError } from '@/lib/api'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner } from '@/components/ui'
import { fmtDateTime, fmtMoney, downloadCsv } from '@/lib/format'

const TYPE_COLOR: Record<string, string> = {
  activated: 'var(--green)',
  renewed: 'var(--blue)',
  canceled: 'var(--red)',
  past_due: 'var(--amber)',
  refunded: 'var(--red)',
  chargeback: 'var(--red)',
}
function TypePill({ type }: { type: string }) {
  const c = TYPE_COLOR[type] || 'var(--text-faint)'
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 12, color: c, background: 'color-mix(in srgb, currentColor 14%, transparent)' }}>
      {type}
    </span>
  )
}

const FILTERS = ['all', 'activated', 'renewed', 'canceled', 'past_due', 'refunded', 'chargeback'] as const

export function RelayEvents() {
  const [type, setType] = useState<string>('all')
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['relay', 'events', type],
    queryFn: () => relayApi.events({ type: type === 'all' ? undefined : type, limit: 2000 }),
  })
  const events = data?.events ?? []

  const exportCsv = () =>
    downloadCsv(
      `relay-billing-events${type === 'all' ? '' : '-' + type}.csv`,
      events.map((e) => ({
        occurred_at: e.occurred_at ?? e.created_at,
        type: e.type,
        user_id: e.user_id ?? '',
        price: e.price ?? '',
        currency: e.currency ?? '',
      })),
    )

  return (
    <Page>
      <PageHeader
        title="Relay · Billing activity"
        subtitle="Every subscription event, newest first"
        actions={
          <div className="row gap-8">
            <select className="select" value={type} onChange={(e) => setType(e.target.value)} style={{ width: 'auto' }}>
              {FILTERS.map((f) => (
                <option key={f} value={f}>{f === 'all' ? 'All types' : f}</option>
              ))}
            </select>
            <button className="btn" onClick={exportCsv} disabled={!events.length}>Export CSV</button>
            <button className="btn" onClick={() => refetch()}>Refresh</button>
          </div>
        }
      />

      {isLoading && <Loading label="Loading events…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {!isLoading &&
        (events.length ? (
          <div className="card">
            <div className="card-title">{events.length} events</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th className="nowrap">When</th>
                    <th>Type</th>
                    <th>User</th>
                    <th className="right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td className="nowrap faint">{fmtDateTime(e.occurred_at ?? e.created_at)}</td>
                      <td><TypePill type={e.type} /></td>
                      <td className="mono" style={{ fontSize: 12 }}>{e.user_id ? e.user_id.slice(0, 8) + '…' : '—'}</td>
                      <td className="right tabnum">{e.price != null ? fmtMoney(e.price, e.currency || 'USD') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState>No billing events{type !== 'all' ? ` of type “${type}”` : ''} yet — they arrive from the Paddle webhook.</EmptyState>
        ))}
    </Page>
  )
}
