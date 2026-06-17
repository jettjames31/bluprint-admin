// GROWTH — referral codes, discount codes, saved segments, and canned
// responses. Each is a card with a read-only table plus a "New …" modal that
// creates a row through the admin-growth function. Mirrors the Leads.tsx
// form/modal style; mutations toast + invalidate the matching query key.
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { growthApi, ApiCallError } from '@/lib/api'
import type { ReferralCode, DiscountCode, SavedSegment, CannedResponse } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, EmptyState, ErrorBanner, Modal, useToast } from '@/components/ui'
import { fmtDate } from '@/lib/format'

// Query keys — kept here so the create modals can invalidate exactly the card
// they belong to.
const KEY = {
  referrals: ['growth', 'referrals'] as const,
  discounts: ['growth', 'discounts'] as const,
  segments: ['growth', 'segments'] as const,
  canned: ['growth', 'canned'] as const,
}

function activeBadge(active: boolean) {
  return <span className={`badge ${active ? 'badge-green' : 'badge-gray'}`}>{active ? 'active' : 'inactive'}</span>
}

// A card wrapper: title, a "New …" action, and either loading / error / empty /
// the table body. Keeps each section visually identical to the others.
function GrowthCard({
  title,
  subtitle,
  newLabel,
  onNew,
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyLabel,
  children,
}: {
  title: string
  subtitle?: string
  newLabel: string
  onNew: () => void
  isLoading: boolean
  error: unknown
  onRetry: () => void
  isEmpty: boolean
  emptyLabel: string
  children: React.ReactNode
}) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="row between" style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
          {subtitle && (
            <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={onNew}>
          {newLabel}
        </button>
      </div>
      {isLoading && <Loading label="Loading…" />}
      {error != null && (
        <div style={{ padding: 16 }}>
          <ErrorBanner message={(error as ApiCallError).message} onRetry={onRetry} />
        </div>
      )}
      {!isLoading && !error && (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {isEmpty ? <EmptyState>{emptyLabel}</EmptyState> : <table className="table">{children}</table>}
        </div>
      )}
    </div>
  )
}

export function Growth() {
  const [modal, setModal] = useState<null | 'referral' | 'discount' | 'segment' | 'canned'>(null)
  const qc = useQueryClient()

  const referrals = useQuery({ queryKey: KEY.referrals, queryFn: () => growthApi.referrals() })
  const discounts = useQuery({ queryKey: KEY.discounts, queryFn: () => growthApi.discounts() })
  const segments = useQuery({ queryKey: KEY.segments, queryFn: () => growthApi.segments() })
  const canned = useQuery({ queryKey: KEY.canned, queryFn: () => growthApi.canned() })

  const referralCodes: ReferralCode[] = referrals.data?.codes ?? []
  const discountCodes: DiscountCode[] = discounts.data?.codes ?? []
  const savedSegments: SavedSegment[] = segments.data?.segments ?? []
  const cannedResponses: CannedResponse[] = canned.data?.canned ?? []

  return (
    <Page>
      <PageHeader
        title="Growth"
        subtitle="Referral & discount codes, saved segments, and canned support replies"
        actions={
          <button
            className="btn"
            onClick={() => {
              referrals.refetch()
              discounts.refetch()
              segments.refetch()
              canned.refetch()
            }}
          >
            Refresh
          </button>
        }
      />

      <div className="grid grid-2">
        <GrowthCard
          title="Referral codes"
          subtitle="Shareable codes that track sign-ups & conversions"
          newLabel="New code"
          onNew={() => setModal('referral')}
          isLoading={referrals.isLoading}
          error={referrals.error}
          onRetry={() => referrals.refetch()}
          isEmpty={!referralCodes.length}
          emptyLabel="No referral codes yet."
        >
          <thead>
            <tr>
              <th>Code</th>
              <th>Owner</th>
              <th className="right">Uses</th>
              <th className="right">Conv.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {referralCodes.map((c) => (
              <tr key={c.code}>
                <td className="mono">{c.code}</td>
                <td className="muted">{c.owner_label || '—'}</td>
                <td className="right tabnum">{c.uses}</td>
                <td className="right tabnum">{c.conversions}</td>
                <td>{activeBadge(c.active)}</td>
              </tr>
            ))}
          </tbody>
        </GrowthCard>

        <GrowthCard
          title="Discount codes"
          subtitle="Percent-off promo codes with optional expiry & caps"
          newLabel="New code"
          onNew={() => setModal('discount')}
          isLoading={discounts.isLoading}
          error={discounts.error}
          onRetry={() => discounts.refetch()}
          isEmpty={!discountCodes.length}
          emptyLabel="No discount codes yet."
        >
          <thead>
            <tr>
              <th>Code</th>
              <th className="right">% off</th>
              <th>Expires</th>
              <th className="right">Redemptions</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {discountCodes.map((c) => (
              <tr key={c.code}>
                <td className="mono">{c.code}</td>
                <td className="right tabnum">{c.percent_off != null ? `${c.percent_off}%` : '—'}</td>
                <td className="muted nowrap">{c.expires_at ? fmtDate(c.expires_at) : <span className="faint">never</span>}</td>
                <td className="right tabnum nowrap">
                  {c.redemptions}
                  <span className="faint"> / {c.max_redemptions != null ? c.max_redemptions : '∞'}</span>
                </td>
                <td>{activeBadge(c.active)}</td>
              </tr>
            ))}
          </tbody>
        </GrowthCard>

        <GrowthCard
          title="Saved segments"
          subtitle="Reusable audience filters (JSON definitions)"
          newLabel="New segment"
          onNew={() => setModal('segment')}
          isLoading={segments.isLoading}
          error={segments.error}
          onRetry={() => segments.refetch()}
          isEmpty={!savedSegments.length}
          emptyLabel="No saved segments yet."
        >
          <thead>
            <tr>
              <th>Name</th>
              <th>Definition</th>
            </tr>
          </thead>
          <tbody>
            {savedSegments.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 550 }}>{s.name}</td>
                <td>
                  <span className="mono" style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 360 }}>
                    {JSON.stringify(s.definition)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </GrowthCard>

        <GrowthCard
          title="Canned responses"
          subtitle="Saved reply templates for support"
          newLabel="New response"
          onNew={() => setModal('canned')}
          isLoading={canned.isLoading}
          error={canned.error}
          onRetry={() => canned.refetch()}
          isEmpty={!cannedResponses.length}
          emptyLabel="No canned responses yet."
        >
          <thead>
            <tr>
              <th>Title</th>
              <th>Body</th>
            </tr>
          </thead>
          <tbody>
            {cannedResponses.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 550 }} className="nowrap">
                  {r.title}
                </td>
                <td className="muted">
                  <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 360 }}>
                    {r.body}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </GrowthCard>
      </div>

      {modal === 'referral' && (
        <NewReferralModal
          onClose={() => setModal(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: KEY.referrals })
            setModal(null)
          }}
        />
      )}
      {modal === 'discount' && (
        <NewDiscountModal
          onClose={() => setModal(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: KEY.discounts })
            setModal(null)
          }}
        />
      )}
      {modal === 'segment' && (
        <NewSegmentModal
          onClose={() => setModal(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: KEY.segments })
            setModal(null)
          }}
        />
      )}
      {modal === 'canned' && (
        <NewCannedModal
          onClose={() => setModal(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: KEY.canned })
            setModal(null)
          }}
        />
      )}
    </Page>
  )
}

// --- New referral code ----------------------------------------
function NewReferralModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [ownerLabel, setOwnerLabel] = useState('')

  const create = useMutation({
    mutationFn: () => growthApi.createReferral(code.trim(), ownerLabel.trim() || undefined),
    onSuccess: () => {
      toast('Referral code created.', 'ok')
      onDone()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const canSubmit = code.trim().length > 0 && !create.isPending

  return (
    <Modal title="New referral code" onClose={onClose}>
      <div className="field">
        <label className="label">Code</label>
        <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. JETT20" />
      </div>
      <div className="field">
        <label className="label">Owner label</label>
        <input
          className="input"
          value={ownerLabel}
          onChange={(e) => setOwnerLabel(e.target.value)}
          placeholder="Optional — e.g. @creator, partner name"
        />
      </div>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose} disabled={create.isPending}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => create.mutate()} disabled={!canSubmit}>
          {create.isPending ? 'Creating…' : 'Create code'}
        </button>
      </div>
    </Modal>
  )
}

// --- New discount code ----------------------------------------
function NewDiscountModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [percentOff, setPercentOff] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState('')

  const create = useMutation({
    mutationFn: () => {
      const pct = percentOff.trim() ? Number(percentOff) : null
      const max = maxRedemptions.trim() ? Number(maxRedemptions) : null
      return growthApi.createDiscount({
        code: code.trim(),
        percent_off: pct,
        // <input type="date"> gives YYYY-MM-DD; normalise to an ISO instant.
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        max_redemptions: max,
      })
    },
    onSuccess: () => {
      toast('Discount code created.', 'ok')
      onDone()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const pctNum = Number(percentOff)
  const pctValid = percentOff.trim() === '' || (!isNaN(pctNum) && pctNum > 0 && pctNum <= 100)
  const maxValid = maxRedemptions.trim() === '' || (Number.isInteger(Number(maxRedemptions)) && Number(maxRedemptions) > 0)
  const canSubmit = code.trim().length > 0 && pctValid && maxValid && !create.isPending

  return (
    <Modal title="New discount code" onClose={onClose}>
      <div className="field">
        <label className="label">Code</label>
        <input className="input mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. LAUNCH50" />
      </div>
      <div className="field">
        <label className="label">Percent off</label>
        <input
          className="input"
          type="number"
          min={1}
          max={100}
          value={percentOff}
          onChange={(e) => setPercentOff(e.target.value)}
          placeholder="1–100"
        />
        {!pctValid && (
          <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>Must be between 1 and 100.</div>
        )}
      </div>
      <div className="grid grid-2">
        <div className="field">
          <label className="label">Expires</label>
          <input className="input" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Max redemptions</label>
          <input
            className="input"
            type="number"
            min={1}
            value={maxRedemptions}
            onChange={(e) => setMaxRedemptions(e.target.value)}
            placeholder="Unlimited"
          />
          {!maxValid && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>Must be a positive whole number.</div>
          )}
        </div>
      </div>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose} disabled={create.isPending}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => create.mutate()} disabled={!canSubmit}>
          {create.isPending ? 'Creating…' : 'Create code'}
        </button>
      </div>
    </Modal>
  )
}

// --- New saved segment ----------------------------------------
function NewSegmentModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [definition, setDefinition] = useState('{\n  \n}')
  const [parseError, setParseError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () => {
      let parsed: Record<string, unknown>
      try {
        const value = JSON.parse(definition)
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          throw new Error('Definition must be a JSON object.')
        }
        parsed = value as Record<string, unknown>
      } catch (e) {
        throw new ApiCallError(e instanceof Error ? e.message : 'Invalid JSON.', 0)
      }
      return growthApi.createSegment(name.trim(), parsed)
    },
    onSuccess: () => {
      toast('Segment saved.', 'ok')
      onDone()
    },
    onError: (e) => {
      const msg = (e as ApiCallError).message
      setParseError(msg)
      toast(msg, 'err')
    },
  })

  // Live-validate so the submit button reflects whether the JSON parses.
  function onDefinitionChange(next: string) {
    setDefinition(next)
    try {
      const value = JSON.parse(next)
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        setParseError('Definition must be a JSON object.')
      } else {
        setParseError(null)
      }
    } catch {
      setParseError('Invalid JSON.')
    }
  }

  const canSubmit = name.trim().length > 0 && !parseError && !create.isPending

  return (
    <Modal title="New saved segment" onClose={onClose}>
      <div className="field">
        <label className="label">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lapsed trials" />
      </div>
      <div className="field">
        <label className="label">Definition (JSON)</label>
        <textarea
          className="textarea mono"
          style={{ minHeight: 120 }}
          value={definition}
          onChange={(e) => onDefinitionChange(e.target.value)}
          placeholder='{ "plan": "free", "lastActiveDays": 30 }'
        />
        {parseError && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{parseError}</div>}
      </div>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose} disabled={create.isPending}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => create.mutate()} disabled={!canSubmit}>
          {create.isPending ? 'Saving…' : 'Save segment'}
        </button>
      </div>
    </Modal>
  )
}

// --- New canned response --------------------------------------
function NewCannedModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const create = useMutation({
    mutationFn: () => growthApi.createCanned(title.trim(), body.trim()),
    onSuccess: () => {
      toast('Canned response created.', 'ok')
      onDone()
    },
    onError: (e) => toast((e as ApiCallError).message, 'err'),
  })

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !create.isPending

  return (
    <Modal title="New canned response" onClose={onClose}>
      <div className="field">
        <label className="label">Title</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Refund policy" />
      </div>
      <div className="field">
        <label className="label">Body</label>
        <textarea
          className="textarea"
          style={{ minHeight: 140 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="The reply text support can drop in…"
        />
      </div>
      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose} disabled={create.isPending}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => create.mutate()} disabled={!canSubmit}>
          {create.isPending ? 'Creating…' : 'Create response'}
        </button>
      </div>
    </Modal>
  )
}
