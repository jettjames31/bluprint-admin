// RELAY — devices & seats. Active device count, how many users hit the seat cap, per-user seat counts,
// and the most-recent devices. admin-relay-devices.
import { useQuery } from '@tanstack/react-query'
import { relayApi, ApiCallError } from '@/lib/api'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner } from '@/components/ui'
import { fmtNum, fmtRelative } from '@/lib/format'

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub != null && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function RelayDevices() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['relay', 'devices'], queryFn: () => relayApi.devices() })

  return (
    <Page>
      <PageHeader
        title="Relay · Devices & seats"
        subtitle="Per-install activations against the seat cap"
        actions={<button className="btn" onClick={() => refetch()}>Refresh</button>}
      />

      {isLoading && <Loading label="Loading devices…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-4">
            <Stat label="Active devices" value={fmtNum(data.total)} sub="not revoked" />
            <Stat label="Users with devices" value={fmtNum(data.usersWithDevices)} />
            <Stat label={`At the cap (${data.cap})`} value={fmtNum(data.atCap)} sub="max seats used" />
            <Stat label="Avg seats / user" value={data.usersWithDevices ? (data.total / data.usersWithDevices).toFixed(1) : '—'} />
          </div>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <div className="card">
              <div className="card-title">Users by device count</div>
              {data.topUsers.length ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead><tr><th>User</th><th className="right">Devices</th></tr></thead>
                    <tbody>
                      {data.topUsers.map((u) => (
                        <tr key={u.user_id}>
                          <td className="mono" style={{ fontSize: 12 }}>{u.user_id.slice(0, 8)}…</td>
                          <td className="right tabnum" style={{ color: u.devices >= data.cap ? 'var(--amber)' : undefined }}>
                            {u.devices} / {data.cap}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>No devices yet.</EmptyState>
              )}
            </div>

            <div className="card">
              <div className="card-title">Recent devices</div>
              {data.recent.length ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead><tr><th>User</th><th>Device</th><th className="nowrap">Last seen</th></tr></thead>
                    <tbody>
                      {data.recent.map((d) => (
                        <tr key={d.user_id + d.device_id}>
                          <td className="mono" style={{ fontSize: 12 }}>{d.user_id.slice(0, 8)}…</td>
                          <td className="mono" style={{ fontSize: 12 }}>{d.label || d.device_id.slice(0, 10) + '…'}</td>
                          <td className="nowrap faint">{fmtRelative(d.last_seen_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>No devices yet — they register when someone signs in on the desktop app.</EmptyState>
              )}
            </div>
          </div>
        </>
      )}
    </Page>
  )
}
