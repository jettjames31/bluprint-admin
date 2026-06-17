// USERS — full list, search, profile detail, grant/revoke premium, delete.
// V1: reads auth.users ⨝ user_state profile via the admin-users function;
// entitlement from the entitlements mirror. "Last active" is approximated by
// max(user_state.updated_at) (see DECISIONS.md).
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, ApiCallError } from '@/lib/api'
import type { AdminUser, PlanStatus } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, Modal, ConfirmModal, useToast } from '@/components/ui'
import { fmtDate, fmtRelative, initials, downloadCsv } from '@/lib/format'

function planBadge(plan: PlanStatus | undefined, active: boolean) {
  if (active) {
    const cls =
      plan === 'trial' ? 'badge-amber' : plan === 'annual' || plan === 'monthly' ? 'badge-green' : 'badge-blue'
    return <span className={`badge ${cls}`}>{plan && plan !== 'unknown' ? plan : 'premium'}</span>
  }
  return <span className="badge badge-gray">free</span>
}

export function Users() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminUser | null>(null)
  const qc = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list({ limit: 1000 }),
  })

  const users = data?.users ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.profile?.name?.toLowerCase().includes(q) ||
        u.profile?.goalLabel?.toLowerCase().includes(q) ||
        u.id.includes(q),
    )
  }, [users, search])

  function exportCsv() {
    downloadCsv(
      `bluprint-users-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((u) => ({
        id: u.id,
        name: u.profile?.name ?? '',
        email: u.email ?? '',
        provider: u.provider ?? '',
        plan: u.entitlement?.active ? u.plan ?? 'premium' : 'free',
        goal: u.profile?.goalLabel ?? '',
        experience: u.profile?.experience ?? '',
        signed_up: u.createdAt ?? '',
        last_active: u.lastActiveAt ?? '',
      })),
    )
  }

  return (
    <Page>
      <PageHeader
        title="Users"
        subtitle={data ? `${data.total ?? users.length} accounts` : 'All Bluprint accounts'}
        actions={
          <>
            <input
              className="input"
              style={{ width: 260 }}
              placeholder="Search name, email, goal, id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="btn" onClick={exportCsv} disabled={!filtered.length}>
              Export CSV
            </button>
            <button className="btn" onClick={() => refetch()}>
              Refresh
            </button>
          </>
        }
      />

      {isLoading && <Loading label="Loading users…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ maxHeight: 'calc(100vh - 230px)', overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Goal</th>
                  <th>Experience</th>
                  <th>Signed up</th>
                  <th>Last active</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="row-click" onClick={() => setSelected(u)}>
                    <td>
                      <div className="row gap-8">
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: 'var(--surface-2)',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--text-dim)',
                            flexShrink: 0,
                          }}
                        >
                          {initials(u.profile?.name, u.email)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 550 }}>{u.profile?.name || '—'}</div>
                          <div className="faint" style={{ fontSize: 12 }}>
                            {u.email || u.phone || u.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{planBadge(u.plan, !!u.entitlement?.active)}</td>
                    <td className="muted">{u.profile?.goalLabel || '—'}</td>
                    <td className="muted">{u.profile?.experience || '—'}</td>
                    <td className="muted nowrap">{fmtDate(u.createdAt)}</td>
                    <td className="muted nowrap">{fmtRelative(u.lastActiveAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <EmptyState>No users match “{search}”.</EmptyState>}
          </div>
        </div>
      )}

      {selected && (
        <UserDetail
          user={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ['users'] })
          }}
        />
      )}
    </Page>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="faint" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ marginTop: 2 }}>{value ?? '—'}</div>
    </div>
  )
}

function UserDetail({
  user,
  onClose,
  onChanged,
}: {
  user: AdminUser
  onClose: () => void
  onChanged: () => void
}) {
  const toast = useToast()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [grantOpen, setGrantOpen] = useState(false)
  const p = user.profile
  const active = !!user.entitlement?.active

  const del = useMutation({
    mutationFn: () => usersApi.delete(user.id),
    onSuccess: () => {
      toast('Account deleted.', 'ok')
      onChanged()
      onClose()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const revoke = useMutation({
    mutationFn: () => usersApi.revokePremium(user.id),
    onSuccess: () => {
      toast('Premium revoked.', 'ok')
      onChanged()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  return (
    <Modal title={p?.name || user.email || 'User'} onClose={onClose} wide>
      <div className="grid grid-2">
        <div>
          <Field label="Email" value={user.email} />
          <Field label="Phone" value={user.phone} />
          <Field label="Provider" value={user.provider} />
          <Field label="User ID" value={<span className="mono">{user.id}</span>} />
          <Field label="Signed up" value={fmtDate(user.createdAt)} />
          <Field label="Last sign-in" value={fmtRelative(user.lastSignInAt)} />
          <Field label="Last active (approx)" value={fmtRelative(user.lastActiveAt)} />
        </div>
        <div>
          <Field label="Plan" value={planBadge(user.plan, active)} />
          {user.entitlement?.expires_at && <Field label="Expires" value={fmtDate(user.entitlement.expires_at)} />}
          {user.entitlement?.reason && <Field label="Grant reason" value={user.entitlement.reason} />}
          <Field label="Goal" value={p?.goalLabel || p?.goalCategory} />
          <Field label="Experience" value={p?.experience} />
          <Field label="Gender" value={p?.gender} />
          <Field
            label="Health flags"
            value={p?.healthFlags?.length ? p.healthFlags.join(', ') : 'none noted'}
          />
          <Field label="Physician" value={p?.physician} />
        </div>
      </div>

      <div
        className="row gap-8 between"
        style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 16 }}
      >
        <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
          Delete account
        </button>
        <div className="row gap-8">
          {active ? (
            <button className="btn btn-sm" onClick={() => revoke.mutate()} disabled={revoke.isPending}>
              {revoke.isPending ? '…' : 'Revoke premium'}
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setGrantOpen(true)}>
              Grant premium
            </button>
          )}
        </div>
      </div>

      {grantOpen && (
        <GrantModal
          user={user}
          onClose={() => setGrantOpen(false)}
          onDone={() => {
            setGrantOpen(false)
            onChanged()
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete this account?"
          danger
          confirmLabel="Delete permanently"
          busy={del.isPending}
          body={
            <>
              This permanently erases <strong>{user.email || user.id}</strong> — their auth user, all synced data,
              photos, and entitlements. This cannot be undone.
            </>
          }
          onConfirm={() => del.mutate()}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </Modal>
  )
}

function GrantModal({ user, onClose, onDone }: { user: AdminUser; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [duration, setDuration] = useState<'forever' | '30' | '90' | '365'>('forever')
  const [reason, setReason] = useState('')

  const grant = useMutation({
    mutationFn: () => {
      let expiresAt: string | null = null
      if (duration !== 'forever') {
        const d = new Date()
        d.setDate(d.getDate() + Number(duration))
        expiresAt = d.toISOString()
      }
      return usersApi.grantPremium({ userId: user.id, expiresAt, reason: reason.trim() || undefined })
    },
    onSuccess: () => {
      toast('Premium granted.', 'ok')
      onDone()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  return (
    <Modal title="Grant premium" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Grants a server entitlement to <strong>{user.email || user.id}</strong>. It loads in the app once the{' '}
        <span className="mono">effectivePremium</span> app change ships (see MORNING-TODO.md).
      </p>
      <div className="field">
        <label className="label">Duration</label>
        <select className="select" value={duration} onChange={(e) => setDuration(e.target.value as typeof duration)}>
          <option value="forever">Forever (no expiry)</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="365">1 year</option>
        </select>
      </div>
      <div className="field">
        <label className="label">Reason (audit trail, optional)</label>
        <input
          className="input"
          placeholder="e.g. tester comp, support goodwill"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => grant.mutate()} disabled={grant.isPending}>
          {grant.isPending ? 'Granting…' : 'Grant premium'}
        </button>
      </div>
    </Modal>
  )
}
