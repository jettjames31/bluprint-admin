// AUDIT LOG — read-only ledger of every privileged action taken through the
// admin functions. Sourced from the `admin-audit` function (audit_log table).
// Filterable client-side over action / actor / target. Nothing here mutates —
// it only reports what already happened.
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi, ApiCallError } from '@/lib/api'
import type { AuditEntry } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner } from '@/components/ui'
import { fmtDateTime } from '@/lib/format'

// Color the action badge by category. The action strings follow a verb_target
// convention (e.g. delete_user, grant_premium, add_admin, edit_compound).
type BadgeColor = 'green' | 'red' | 'blue' | 'gray'

function actionColor(action: string): BadgeColor {
  const a = action.toLowerCase()
  if (a.startsWith('delete_') || a.startsWith('revoke_')) return 'red'
  if (a.startsWith('grant_') || a.startsWith('add_admin')) return 'green'
  if (a.startsWith('edit_') || a.startsWith('set_') || a.startsWith('send_')) return 'blue'
  return 'gray'
}

function actorOf(e: AuditEntry): string {
  return e.actor_email || e.actor_id || '—'
}

function targetOf(e: AuditEntry): string {
  if (!e.target_type && !e.target_id) return '—'
  if (e.target_type && e.target_id) return `${e.target_type}:${e.target_id}`
  return e.target_type || e.target_id || '—'
}

function metaOf(e: AuditEntry): string {
  if (!e.meta || Object.keys(e.meta).length === 0) return ''
  try {
    return JSON.stringify(e.meta)
  } catch {
    return ''
  }
}

export function Audit() {
  const [search, setSearch] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audit'],
    queryFn: () => auditApi.list({ limit: 200 }),
  })

  const entries = data?.entries ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) =>
        e.action.toLowerCase().includes(q) ||
        actorOf(e).toLowerCase().includes(q) ||
        targetOf(e).toLowerCase().includes(q),
    )
  }, [entries, search])

  return (
    <Page>
      <PageHeader
        title="Audit Log"
        subtitle="Every privileged action is recorded."
        actions={
          <>
            <input
              className="input"
              style={{ width: 260 }}
              placeholder="Filter action, actor, target…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn" onClick={() => refetch()}>
              Refresh
            </button>
          </>
        }
      />

      {isLoading && <Loading label="Loading audit log…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ maxHeight: 'calc(100vh - 230px)', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Reason</th>
                  <th>Meta</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const meta = metaOf(e)
                  return (
                    <tr key={e.id}>
                      <td className="muted nowrap">{fmtDateTime(e.created_at)}</td>
                      <td>
                        <span className="mono">{actorOf(e)}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${actionColor(e.action)}`}>{e.action}</span>
                      </td>
                      <td>
                        <span className="mono">{targetOf(e)}</span>
                      </td>
                      <td className="muted">{e.reason || '—'}</td>
                      <td>
                        {meta ? (
                          <span
                            className="mono faint"
                            title={meta}
                            style={{
                              display: 'inline-block',
                              maxWidth: 240,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              verticalAlign: 'middle',
                              fontSize: 11,
                            }}
                          >
                            {meta}
                          </span>
                        ) : (
                          <span className="faint">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!filtered.length && (
              <EmptyState>
                {search ? `No actions match “${search}”.` : 'No privileged actions recorded yet.'}
              </EmptyState>
            )}
          </div>
        </div>
      )}
    </Page>
  )
}
