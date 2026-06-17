// SUBSCRIPTIONS — at-risk, comped users, refunds/cancellations, and the raw
// subscription event feed. Sourced from the admin-subscriptions function:
// comps + at-risk come from the entitlements mirror (always available),
// while the event/refund feed depends on the RevenueCat webhook being wired
// (configured:false / empty events -> we surface data.note but still render
// the entitlement-backed tables).
import { useQuery } from '@tanstack/react-query'
import { subscriptionsApi, ApiCallError } from '@/lib/api'
import type { SubscriptionEvent } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner } from '@/components/ui'
import { fmtDate, fmtDateTime, fmtRelative, fmtMoney } from '@/lib/format'

// Map a raw event type onto one of the functional badge hues. Refunds /
// cancellations read red; (re)activations green; trials amber; the rest gray.
function eventBadgeClass(type: string): string {
  const t = type.toLowerCase()
  if (/(refund|cancel|expir|billing_issue|revoke)/.test(t)) return 'badge-red'
  if (/(trial)/.test(t)) return 'badge-amber'
  if (/(renew|purchase|activat|conversion|initial)/.test(t)) return 'badge-green'
  if (/(uncancel|product_change|transfer)/.test(t)) return 'badge-blue'
  return 'badge-gray'
}

function EventType({ type, className }: { type: string; className?: string }) {
  return <span className={`badge ${className ?? eventBadgeClass(type)}`}>{type || '—'}</span>
}

export function Subscriptions() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptionsApi.summary(),
  })

  const atRisk = data?.atRisk ?? []
  const comped = data?.comped ?? []
  const refunds = data?.refunds ?? []
  const events = data?.events ?? []
  // The event feed (incl. refunds) needs the RevenueCat webhook. Comps and
  // at-risk are entitlement-mirror backed and render regardless.
  const feedDark = !!data && (data.configured === false || events.length === 0)

  return (
    <Page>
      <PageHeader
        title="Subscriptions"
        subtitle="At-risk, comps, refunds, and the raw subscription event feed"
        actions={
          <button className="btn" onClick={() => refetch()}>
            Refresh
          </button>
        }
      />

      {isLoading && <Loading label="Loading subscriptions…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
          {/* At-risk — entitlement-backed, always present */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 0' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>
                At-risk · {atRisk.length}
              </div>
            </div>
            {atRisk.length ? (
              <table className="table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Reason</th>
                    <th className="right">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {atRisk.map((u) => (
                    <tr key={u.user_id}>
                      <td>{u.email || <span className="mono">{u.user_id.slice(0, 8)}</span>}</td>
                      <td>
                        <span className="badge badge-amber">{u.reason}</span>
                      </td>
                      <td className="right muted nowrap tabnum">{fmtRelative(u.expires_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState>No subscriptions are flagged at-risk.</EmptyState>
            )}
          </div>

          {/* Comped users — entitlement-backed, always present */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 0' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>
                Comped users · {comped.length}
              </div>
            </div>
            {comped.length ? (
              <table className="table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Reason</th>
                    <th>Granted by</th>
                    <th className="nowrap">Expires</th>
                    <th className="nowrap">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {comped.map((u) => (
                    <tr key={u.user_id}>
                      <td>
                        <div className="row gap-8">
                          <span className="badge badge-purple">comp</span>
                          <span>{u.email || <span className="mono">{u.user_id.slice(0, 8)}</span>}</span>
                        </div>
                      </td>
                      <td className="muted">{u.reason || '—'}</td>
                      <td className="mono">{u.granted_by || '—'}</td>
                      <td className="muted nowrap">{u.expires_at ? fmtDate(u.expires_at) : 'never'}</td>
                      <td className="muted nowrap">{fmtDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState>No comped users yet — grant premium from the Users page.</EmptyState>
            )}
          </div>

          {/* Webhook-not-wired explainer — keep the comp/at-risk tables above */}
          {feedDark && data.note && (
            <div
              className="card"
              style={{ borderColor: 'var(--blue)', background: 'var(--blue-dim)' }}
            >
              <div className="card-title" style={{ color: 'var(--blue)' }}>
                Event feed
              </div>
              <p style={{ margin: 0, color: 'var(--text)', fontSize: 13, lineHeight: 1.6 }}>
                {data.note}
              </p>
            </div>
          )}

          {/* Refunds & cancellations — from the event feed */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 0' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>
                Refunds &amp; cancellations · {refunds.length}
              </div>
            </div>
            {refunds.length ? (
              <table className="table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th className="nowrap">When</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Product</th>
                    <th className="right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((e: SubscriptionEvent) => (
                    <tr key={e.id}>
                      <td className="muted nowrap">{fmtDateTime(e.event_at)}</td>
                      <td>{e.email || <span className="mono">{e.user_id?.slice(0, 8) ?? '—'}</span>}</td>
                      <td>
                        <EventType type={e.type} className="badge-red" />
                      </td>
                      <td className="mono">{e.product_id || '—'}</td>
                      <td className="right tabnum nowrap">{fmtMoney(e.price, e.currency ?? 'USD')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState>No refunds or cancellations.</EmptyState>
            )}
          </div>

          {/* Recent subscription events — full raw feed */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 0' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>
                Recent subscription events · {events.length}
              </div>
            </div>
            {events.length ? (
              <table className="table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th className="nowrap">When</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Store</th>
                    <th className="right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e: SubscriptionEvent) => (
                    <tr key={e.id}>
                      <td className="muted nowrap">{fmtDateTime(e.event_at)}</td>
                      <td>{e.email || <span className="mono">{e.user_id?.slice(0, 8) ?? '—'}</span>}</td>
                      <td>
                        <EventType type={e.type} />
                      </td>
                      <td className="mono">{e.product_id || '—'}</td>
                      <td className="muted nowrap">{e.store || '—'}</td>
                      <td className="right tabnum nowrap">{fmtMoney(e.price, e.currency ?? 'USD')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState>
                No subscription events yet — they stream in once the RevenueCat webhook is wired.
              </EmptyState>
            )}
          </div>
        </div>
      )}
    </Page>
  )
}
