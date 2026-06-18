// SETTINGS — three config sections, each with its own query + mutations:
//   1) Admin users (founder allowlist) — adminsApi.list/add/remove.
//   2) Feature flags & limits — flagsApi.list/set, with a typed editor per flag
//      and a privacy ConfirmModal gate around ai_query_logging (see DECISIONS.md).
//   3) Consent versions — consentApi.list/publish; auto-incrementing per kind.
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminsApi, flagsApi, consentApi, ApiCallError } from '@/lib/api'
import type { AdminRecord, FeatureFlag, ConsentVersion } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, ConfirmModal, useToast } from '@/components/ui'
import { fmtDate } from '@/lib/format'
import { useLarp } from '@/lib/larp'
import { useUpdateCheck, RUNNING_BUILD, APP_VERSION } from '@/lib/useUpdateCheck'

export function Settings() {
  return (
    <Page>
      <PageHeader
        title="Settings"
        subtitle="Admin access, feature flags & limits, and consent versions."
      />
      <div className="grid" style={{ gap: 16 }}>
        <UpdatesCard />
        <LarpCard />
        <AdminsCard />
        <FlagsCard />
        <ConsentCard />
      </div>
    </Page>
  )
}

// ============================================================
// APP & UPDATES — current build + a manual "check for updates"
// ============================================================
function UpdatesCard() {
  const { status, check, reload } = useUpdateCheck()
  const msg =
    status.kind === 'current'
      ? "You're on the latest build."
      : status.kind === 'available'
        ? `Update available — build ${status.buildId}. Reload to get it (you won't be signed out).`
        : status.kind === 'error'
          ? status.message
          : status.kind === 'checking'
            ? 'Checking the update server…'
            : 'The dashboard auto-updates — check whether a newer build has been published.'
  return (
    <div className="card">
      <div className="card-title">App &amp; updates</div>
      <div className="row between wrap" style={{ alignItems: 'center', gap: 12 }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontWeight: 500 }}>
            v{APP_VERSION} <span className="mono faint" style={{ fontSize: 12.5 }}>({RUNNING_BUILD})</span>
          </div>
          <p className="faint" style={{ marginTop: 6, marginBottom: 0, fontSize: 12.5, lineHeight: 1.6 }}>{msg}</p>
        </div>
        {status.kind === 'available' ? (
          <button className="btn btn-gradient" onClick={reload}>
            Reload to update
          </button>
        ) : (
          <button className="btn btn-primary" onClick={check} disabled={status.kind === 'checking'}>
            {status.kind === 'checking' ? 'Checking…' : 'Check for updates'}
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// LARP MODE — toggle the cosmetic "legendary stats" overlay
// ============================================================
function LarpCard() {
  const { larp, setLarp } = useLarp()
  return (
    <div className="card">
      <div className="card-title">LARP mode</div>
      <div className="row between wrap" style={{ alignItems: 'center', gap: 12 }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontWeight: 500 }}>
            Legendary stats <span className="badge badge-purple">demo</span>
          </div>
          <p className="faint" style={{ marginTop: 6, marginBottom: 0, fontSize: 12.5, lineHeight: 1.6 }}>
            Overlays the Overview and Revenue charts with hockey-stick numbers — ~$92K MRR, 48K users, near-zero churn.
            Purely cosmetic and only on this device; flip off to see real data. Fun for screenshots — don't mistake it
            for the real thing.
          </p>
        </div>
        <button
          className={`btn ${larp ? 'btn-gradient' : ''}`}
          onClick={() => setLarp(!larp)}
          style={{ minWidth: 80, justifyContent: 'center' }}
        >
          {larp ? 'On' : 'Off'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// 1) ADMIN USERS
// ============================================================
function AdminsCard() {
  const qc = useQueryClient()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('founder')
  const [removing, setRemoving] = useState<AdminRecord | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admins'],
    queryFn: () => adminsApi.list(),
  })

  const add = useMutation({
    mutationFn: () => adminsApi.add(email.trim(), role),
    onSuccess: () => {
      toast('Admin added.', 'ok')
      setEmail('')
      qc.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const remove = useMutation({
    mutationFn: (userId: string) => adminsApi.remove(userId),
    onSuccess: () => {
      toast('Admin removed.', 'ok')
      setRemoving(null)
      qc.invalidateQueries({ queryKey: ['admins'] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const admins = data?.admins ?? []

  return (
    <div className="card">
      <div className="card-title">Admin users</div>

      {isLoading && <Loading label="Loading admins…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.user_id}>
                    <td>{a.email || <span className="mono">{a.user_id}</span>}</td>
                    <td>
                      <span className="badge badge-purple">{a.role}</span>
                    </td>
                    <td className="muted nowrap">{fmtDate(a.added_at)}</td>
                    <td className="right">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setRemoving(a)}
                        disabled={remove.isPending}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!admins.length && <EmptyState>No admins yet.</EmptyState>}

          <form
            className="row gap-8 wrap"
            style={{ marginTop: 16, alignItems: 'flex-end' }}
            onSubmit={(e) => {
              e.preventDefault()
              if (email.trim()) add.mutate()
            }}
          >
            <div className="field grow" style={{ marginBottom: 0, minWidth: 220 }}>
              <label className="label">Add admin (email)</label>
              <input
                className="input"
                type="email"
                placeholder="founder@bluprint.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field" style={{ marginBottom: 0, width: 140 }}>
              <label className="label">Role</label>
              <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="founder">founder</option>
                <option value="support">support</option>
                <option value="readonly">readonly</option>
              </select>
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={add.isPending || !email.trim()}
            >
              {add.isPending ? 'Adding…' : 'Add'}
            </button>
          </form>
          <div className="faint" style={{ marginTop: 8, fontSize: 12 }}>
            The person must sign in to the dashboard once first (so their auth user exists), otherwise
            the add fails with “No auth user with email …”.
          </div>
        </>
      )}

      {removing && (
        <ConfirmModal
          title="Remove this admin?"
          danger
          confirmLabel="Remove"
          busy={remove.isPending}
          body={
            <>
              Revoke dashboard access for{' '}
              <strong>{removing.email || removing.user_id}</strong>? They lose access to all admin
              functions immediately.
            </>
          }
          onConfirm={() => remove.mutate(removing.user_id)}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// 2) FEATURE FLAGS & LIMITS
// ============================================================
function FlagsCard() {
  const qc = useQueryClient()
  const toast = useToast()
  const [confirmFlag, setConfirmFlag] = useState<FeatureFlag | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['flags'],
    queryFn: () => flagsApi.list(),
  })

  const set = useMutation({
    mutationFn: (vars: { key: string; value: unknown; description?: string }) =>
      flagsApi.set(vars.key, vars.value, vars.description),
    onSuccess: () => {
      toast('Flag saved.', 'ok')
      qc.invalidateQueries({ queryKey: ['flags'] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const flags = data?.flags ?? []

  function toggle(flag: FeatureFlag, next: boolean) {
    // ai_query_logging stores users' health questions — gate enabling it.
    if (flag.key === 'ai_query_logging' && next) {
      setConfirmFlag(flag)
      return
    }
    set.mutate({ key: flag.key, value: next, description: flag.description ?? undefined })
  }

  return (
    <div className="card">
      <div className="card-title">Feature flags & limits</div>

      {isLoading && <Loading label="Loading flags…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Flag</th>
                  <th>Description</th>
                  <th className="right">Value</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <tr key={flag.key}>
                    <td>
                      <div className="row gap-8 wrap">
                        <span className="mono" style={{ color: 'var(--text)' }}>
                          {flag.key}
                        </span>
                        {flag.key === 'ai_query_logging' && (
                          <span className="badge badge-amber">PRIVACY</span>
                        )}
                      </div>
                    </td>
                    <td className="faint" style={{ maxWidth: 360 }}>
                      {flag.description || '—'}
                    </td>
                    <td className="right">
                      <FlagEditor
                        flag={flag}
                        busy={set.isPending}
                        onToggle={(next) => toggle(flag, next)}
                        onSetNumber={(n) =>
                          set.mutate({
                            key: flag.key,
                            value: n,
                            description: flag.description ?? undefined,
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!flags.length && <EmptyState>No feature flags configured.</EmptyState>}
        </>
      )}

      {confirmFlag && (
        <ConfirmModal
          title="Enable AI query logging?"
          danger
          confirmLabel="Enable logging"
          busy={set.isPending}
          body={
            <>
              This stores the full text of users' AI questions (and responses) — i.e. their{' '}
              <strong>health questions</strong> — in the <span className="mono">ai_queries</span>{' '}
              table. It is off by default for privacy (see DECISIONS.md). Only enable it for active
              debugging, and turn it back off when done.
            </>
          }
          onConfirm={() => {
            set.mutate(
              {
                key: confirmFlag.key,
                value: true,
                description: confirmFlag.description ?? undefined,
              },
              { onSettled: () => setConfirmFlag(null) },
            )
          }}
          onClose={() => setConfirmFlag(null)}
        />
      )}
    </div>
  )
}

function FlagEditor({
  flag,
  busy,
  onToggle,
  onSetNumber,
}: {
  flag: FeatureFlag
  busy: boolean
  onToggle: (next: boolean) => void
  onSetNumber: (n: number) => void
}) {
  // Boolean flag -> toggle button.
  if (typeof flag.value === 'boolean') {
    const on = flag.value
    return (
      <button
        className={`btn btn-sm ${on ? 'btn-primary' : ''}`}
        onClick={() => onToggle(!on)}
        disabled={busy}
        style={{ minWidth: 64, justifyContent: 'center' }}
      >
        {on ? 'true' : 'false'}
      </button>
    )
  }

  // Number flag (e.g. free_daily_limit) -> input + Save.
  if (typeof flag.value === 'number') {
    return <NumberFlagEditor value={flag.value} busy={busy} onSave={onSetNumber} />
  }

  // Anything else (string/object): show read-only JSON; not editable inline.
  return (
    <span className="mono" style={{ color: 'var(--text-dim)' }}>
      {JSON.stringify(flag.value)}
    </span>
  )
}

function NumberFlagEditor({
  value,
  busy,
  onSave,
}: {
  value: number
  busy: boolean
  onSave: (n: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  const dirty = draft.trim() !== String(value)
  const parsed = Number(draft)
  const valid = draft.trim() !== '' && !Number.isNaN(parsed)

  return (
    <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
      <input
        className="input tabnum"
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        style={{ width: 90, textAlign: 'right' }}
      />
      <button
        className="btn btn-sm"
        onClick={() => valid && onSave(parsed)}
        disabled={busy || !dirty || !valid}
      >
        Save
      </button>
    </div>
  )
}

// ============================================================
// 3) CONSENT VERSIONS
// ============================================================
const CONSENT_KINDS = ['ai', 'tos', 'privacy'] as const
type ConsentKind = (typeof CONSENT_KINDS)[number]

const KIND_LABEL: Record<string, string> = {
  ai: 'AI disclaimer',
  tos: 'Terms of service',
  privacy: 'Privacy policy',
}

function ConsentCard() {
  const qc = useQueryClient()
  const toast = useToast()
  const [kind, setKind] = useState<ConsentKind>('ai')
  const [body, setBody] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['consent'],
    queryFn: () => consentApi.list(),
  })

  const publish = useMutation({
    mutationFn: () => consentApi.publish(kind, body.trim()),
    onSuccess: (res) => {
      toast(`Published ${KIND_LABEL[res.version.kind] ?? res.version.kind} v${res.version.version}.`, 'ok')
      setBody('')
      qc.invalidateQueries({ queryKey: ['consent'] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const versions = data?.versions ?? []

  // Group by kind, newest version first within each group.
  const groups = useMemo(() => {
    const byKind = new Map<string, ConsentVersion[]>()
    for (const v of versions) {
      const list = byKind.get(v.kind) ?? []
      list.push(v)
      byKind.set(v.kind, list)
    }
    for (const list of byKind.values()) list.sort((a, b) => b.version - a.version)
    return [...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [versions])

  return (
    <div className="card">
      <div className="card-title">Consent versions</div>

      {isLoading && <Loading label="Loading consent versions…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <>
          {!groups.length && <EmptyState>No consent versions published yet.</EmptyState>}

          {groups.map(([k, list]) => {
            const active = list.find((v) => v.active) ?? list[0]
            return (
              <div key={k} style={{ marginBottom: 18 }}>
                <div className="row gap-8 between" style={{ marginBottom: 8 }}>
                  <div className="row gap-8">
                    <strong>{KIND_LABEL[k] ?? k}</strong>
                    <span className="mono">{k}</span>
                  </div>
                  {active && (
                    <div className="faint" style={{ fontSize: 12 }}>
                      Active: v{active.version} · {fmtDate(active.created_at)}
                    </div>
                  )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Version</th>
                        <th>Published</th>
                        <th className="right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((v) => (
                        <tr key={v.id}>
                          <td className="tabnum">v{v.version}</td>
                          <td className="muted nowrap">{fmtDate(v.created_at)}</td>
                          <td className="right">
                            {v.active ? (
                              <span className="badge badge-green">active</span>
                            ) : (
                              <span className="badge badge-gray">prior</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          <form
            style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 16 }}
            onSubmit={(e) => {
              e.preventDefault()
              if (body.trim()) publish.mutate()
            }}
          >
            <div className="card-title" style={{ marginBottom: 12 }}>
              Publish new version
            </div>
            <div className="field" style={{ width: 200 }}>
              <label className="label">Kind</label>
              <select
                className="select"
                value={kind}
                onChange={(e) => setKind(e.target.value as ConsentKind)}
              >
                {CONSENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Body</label>
              <textarea
                className="textarea"
                placeholder="Full consent / disclaimer text shown to users…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ minHeight: 120 }}
              />
              <div className="faint" style={{ marginTop: 6, fontSize: 12 }}>
                Publishing auto-increments the version for this kind and marks it active.
              </div>
            </div>
            <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={publish.isPending || !body.trim()}
              >
                {publish.isPending ? 'Publishing…' : 'Publish new version'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
