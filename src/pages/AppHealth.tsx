// APP HEALTH — live operational pulse from the admin-health function.
// status() probes Supabase (with a latency sample), the RevenueCat webhook's
// last event, active-user counts, and the 24h error count. errors() returns
// the recent error log. The whole page auto-refreshes every 30s so it can be
// left open on a second monitor; a manual Refresh forces an immediate pull.
import { useQuery } from '@tanstack/react-query'
import { healthApi, ApiCallError } from '@/lib/api'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner } from '@/components/ui'
import { fmtDateTime, fmtNum, fmtRelative } from '@/lib/format'

const REFRESH_MS = 30_000

export function AppHealth() {
  const status = useQuery({
    queryKey: ['health', 'status'],
    queryFn: () => healthApi.status(),
    refetchInterval: REFRESH_MS,
  })
  const errors = useQuery({
    queryKey: ['health', 'errors'],
    queryFn: () => healthApi.errors(100),
    refetchInterval: REFRESH_MS,
  })

  const refreshAll = () => {
    status.refetch()
    errors.refetch()
  }

  const health = status.data
  const errorRows = errors.data?.errors ?? []

  return (
    <Page>
      <PageHeader
        title="App Health"
        subtitle={
          health ? `Last checked ${fmtRelative(health.checkedAt)} · auto-refreshes every 30s` : 'Live operational status'
        }
        actions={
          <button className="btn" onClick={refreshAll}>
            Refresh
          </button>
        }
      />

      {status.isLoading && <Loading label="Checking systems…" />}
      {status.error && (
        <ErrorBanner message={(status.error as ApiCallError).message} onRetry={() => status.refetch()} />
      )}

      {health && (
        <div className="grid grid-4">
          <div className="stat">
            <div className="stat-label">Supabase</div>
            <div className="stat-value">
              <span className="row gap-8">
                <span className={`dot ${health.supabase.ok ? 'dot-green' : 'dot-red'}`} />
                {health.supabase.ok ? 'Connected' : 'Down'}
              </span>
            </div>
            <div className="stat-sub">
              {health.supabase.latencyMs != null ? `${fmtNum(health.supabase.latencyMs)} ms latency` : 'latency —'}
            </div>
          </div>

          <div className="stat">
            <div className="stat-label">RevenueCat webhook</div>
            <div className="stat-value">
              <span className="row gap-8">
                <span className={`dot ${health.revenuecatWebhook.ok ? 'dot-green' : 'dot-red'}`} />
                {health.revenuecatWebhook.ok ? 'Healthy' : 'Stale'}
              </span>
            </div>
            <div className="stat-sub">Last event {fmtRelative(health.revenuecatWebhook.lastEventAt)}</div>
          </div>

          <div className="stat">
            <div className="stat-label">Active users</div>
            <div className="stat-value tabnum">{fmtNum(health.activeUsers.last24h)}</div>
            <div className="stat-sub">
              24h · <span className="tabnum">{fmtNum(health.activeUsers.last7d)}</span> in 7d
            </div>
          </div>

          <div className="stat">
            <div className="stat-label">Errors (24h)</div>
            <div className="stat-value">
              {health.errors24h > 0 ? (
                <span className="badge badge-red">{fmtNum(health.errors24h)}</span>
              ) : (
                <span className="tabnum">0</span>
              )}
            </div>
            <div className="stat-sub">{health.errors24h > 0 ? 'needs a look' : 'all clear'}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
        <div className="row between" style={{ padding: '14px 16px' }}>
          <div className="card-title" style={{ margin: 0 }}>
            Recent errors
          </div>
          {errorRows.length > 0 && <span className="faint">{fmtNum(errorRows.length)} logged</span>}
        </div>

        {errors.error && (
          <div style={{ padding: '0 16px 16px' }}>
            <ErrorBanner message={(errors.error as ApiCallError).message} onRetry={() => errors.refetch()} />
          </div>
        )}

        {errors.isLoading && !errors.data && <Loading label="Loading errors…" />}

        {errors.data && errorRows.length === 0 && <EmptyState>No errors logged. Nice and quiet.</EmptyState>}

        {errorRows.length > 0 && (
          <div style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Function</th>
                  <th>Kind</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {errorRows.map((e) => (
                  <tr key={e.id}>
                    <td className="muted nowrap">{fmtDateTime(e.created_at)}</td>
                    <td>
                      {e.fn ? (
                        <span className="badge badge-gray mono">{e.fn}</span>
                      ) : (
                        <span className="faint">—</span>
                      )}
                    </td>
                    <td className="muted nowrap">{e.kind || '—'}</td>
                    <td
                      className="mono"
                      title={e.message}
                      style={{ maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {e.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  )
}
