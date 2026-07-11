// RELAY — license keys. Mint comp/beta keys, view them, revoke. Backs the desktop app's
// "Enter a license key" flow (relay-redeem). admin-relay-licenses (list | create | revoke).
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { relayApi, ApiCallError } from '@/lib/api'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, ConfirmModal, useToast } from '@/components/ui'
import { fmtDate, downloadCsv } from '@/lib/format'
import type { RelayLicense } from '@/types'

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }

export function RelayLicenses() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['relay', 'licenses'], queryFn: () => relayApi.licenses.list() })

  const [kind, setKind] = useState('comp')
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [lastKey, setLastKey] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<RelayLicense | null>(null)

  const create = useMutation({
    mutationFn: () => relayApi.licenses.create({ kind, owner_label: label.trim() || undefined, note: note.trim() || undefined }),
    onSuccess: (r) => {
      setLastKey(r.license?.key ?? null)
      setLabel('')
      setNote('')
      toast('Key minted.', 'ok')
      qc.invalidateQueries({ queryKey: ['relay', 'licenses'] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })
  const revoke = useMutation({
    mutationFn: (key: string) => relayApi.licenses.revoke(key),
    onSuccess: () => {
      toast('Key revoked.', 'ok')
      setRevoking(null)
      qc.invalidateQueries({ queryKey: ['relay', 'licenses'] })
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const licenses = data?.licenses ?? []
  const copy = (k: string) => {
    navigator.clipboard?.writeText(k)
    toast('Copied.', 'ok')
  }
  const exportCsv = () =>
    downloadCsv(
      'relay-license-keys.csv',
      licenses.map((l) => ({
        key: l.key,
        kind: l.kind,
        status: l.status,
        redeemed_by: l.user_id ?? '',
        owner_label: l.owner_label ?? '',
        note: l.note ?? '',
        created_at: l.created_at,
        revoked_at: l.revoked_at ?? '',
      })),
    )

  return (
    <Page>
      <PageHeader
        title="Relay · License keys"
        subtitle="Mint comp / beta keys — redeemable in the app’s “Enter a license key”"
        actions={
          <div className="row gap-8">
            <button className="btn" onClick={exportCsv} disabled={!licenses.length}>
              Export CSV
            </button>
            <button className="btn" onClick={() => refetch()}>
              Refresh
            </button>
          </div>
        }
      />

      <div className="card">
        <div className="card-title">Mint a key</div>
        <div className="row gap-8" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={fieldStyle}>
            <span className="faint">Kind</span>
            <select className="select" value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: 'auto' }}>
              <option value="comp">Comp</option>
              <option value="beta">Beta</option>
            </select>
          </label>
          <label style={{ ...fieldStyle, flex: '1 1 180px' }}>
            <span className="faint">Label (optional)</span>
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Jane (press)" />
          </label>
          <label style={{ ...fieldStyle, flex: '1 1 180px' }}>
            <span className="faint">Note (optional)</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="internal note" />
          </label>
          <button className="btn btn-primary" disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Minting…' : 'Mint key'}
          </button>
        </div>
        {lastKey && (
          <div className="row gap-8" style={{ marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <code className="mono" style={{ padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}>
              {lastKey}
            </code>
            <button className="btn btn-sm" onClick={() => copy(lastKey)}>
              Copy
            </button>
            <span className="faint" style={{ fontSize: 12 }}>Share this once — the holder redeems it in the app.</span>
          </div>
        )}
      </div>

      {isLoading && <Loading label="Loading keys…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {!isLoading &&
        (licenses.length ? (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="card-title">Keys · {licenses.length}</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Kind</th>
                    <th>Status</th>
                    <th>Redeemed by</th>
                    <th className="nowrap">Created</th>
                    <th className="right"></th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((l) => (
                    <tr key={l.key}>
                      <td>
                        <button className="btn btn-ghost btn-sm mono" style={{ fontSize: 12 }} onClick={() => copy(l.key)} title="Copy full key">
                          {l.key.slice(0, 16)}…
                        </button>
                      </td>
                      <td>{l.kind}</td>
                      <td>
                        <span style={{ color: l.status === 'active' ? 'var(--green)' : 'var(--red)' }}>{l.status}</span>
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {l.user_id ? l.user_id.slice(0, 8) + '…' : <span className="faint">unredeemed</span>}
                      </td>
                      <td className="nowrap">{fmtDate(l.created_at)}</td>
                      <td className="right">
                        {l.status === 'active' && (
                          <button className="btn btn-danger btn-sm" onClick={() => setRevoking(l)}>
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState>No keys yet — mint one above.</EmptyState>
        ))}

      {revoking && (
        <ConfirmModal
          title="Revoke this key?"
          confirmLabel="Revoke"
          danger
          busy={revoke.isPending}
          onClose={() => setRevoking(null)}
          onConfirm={() => revoke.mutate(revoking.key)}
          body={
            <p>
              Revoking <span className="mono">{revoking.key.slice(0, 16)}…</span> blocks new redemptions immediately. A
              user who already redeemed it loses access at their next revalidation.
            </p>
          }
        />
      )}
    </Page>
  )
}
