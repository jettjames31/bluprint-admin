// PORTFOLIO — the across-all-apps view. Each registered app's headline KPIs
// (from its own admin-overview, the common contract) plus combined totals.
// Click an app to make it active and drill into its tailored pages. In LARP
// mode it shows a fake multi-app empire.
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { overviewApi, ApiCallError } from '@/lib/api'
import type { OverviewKpis } from '@/types'
import { useActiveApp } from '@/lib/activeApp'
import { useLarp } from '@/lib/larp'
import { larpPortfolio } from '@/lib/larpData'
import { Page, PageHeader } from '@/components/Layout'
import { Loading } from '@/components/ui'
import { fmtNum } from '@/lib/format'

interface Row {
  id: string
  name: string
  short: string
  color: string
  live: boolean
  kpis: Partial<OverviewKpis> | null
  error?: string
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="faint" style={{ fontSize: 11.5 }}>{label}</div>
      <div className="tabnum" style={{ fontSize: 18, fontWeight: 500, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function Monogram({ short, color }: { short: string; color: string }) {
  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        fontWeight: 500,
        color: '#fff',
        background: color,
      }}
    >
      {short}
    </div>
  )
}

export function Portfolio() {
  const { apps, setApp } = useActiveApp()
  const { larp, seed } = useLarp()
  const nav = useNavigate()

  const liveApps = apps.filter((a) => a.live)
  const q = useQuery({
    queryKey: ['portfolio', liveApps.map((a) => a.id).join(',')],
    enabled: !larp,
    queryFn: async () => {
      const results = await Promise.allSettled(liveApps.map((a) => overviewApi.kpisFor(a)))
      const map: Record<string, { kpis?: OverviewKpis; error?: string }> = {}
      liveApps.forEach((a, i) => {
        const r = results[i]
        map[a.id] = r.status === 'fulfilled' ? { kpis: r.value } : { error: (r.reason as ApiCallError)?.message || 'failed' }
      })
      return map
    },
  })

  const rows: Row[] = larp
    ? larpPortfolio(seed, apps.map((a) => ({ id: a.id, name: a.name, short: a.short, color: a.color }))).map((p) => ({
        id: p.id,
        name: p.name,
        short: p.short,
        color: p.color,
        live: true,
        kpis: { users: p.users, premium: p.premium, dau: p.dau, newSubsWeek: p.newSubsWeek },
      }))
    : apps.map((a) => ({
        id: a.id,
        name: a.name,
        short: a.short,
        color: a.color,
        live: a.live,
        kpis: q.data?.[a.id]?.kpis ?? null,
        error: q.data?.[a.id]?.error,
      }))

  const totals = rows.reduce(
    (s, r) => ({
      users: s.users + (r.kpis?.users ?? 0),
      premium: s.premium + (r.kpis?.premium ?? 0),
      dau: s.dau + (r.kpis?.dau ?? 0),
      newSubsWeek: s.newSubsWeek + (r.kpis?.newSubsWeek ?? 0),
    }),
    { users: 0, premium: 0, dau: 0, newSubsWeek: 0 },
  )

  function open(id: string, live: boolean) {
    if (!live) return
    setApp(id)
    nav(apps.find((a) => a.id === id)?.home ?? '/')
  }

  return (
    <Page>
      <PageHeader
        title="Portfolio"
        subtitle="Every app at a glance — click one to drill into its tailored dashboards"
      />

      {/* Combined totals */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">All apps combined</div>
        <div className="grid grid-4">
          <Tile label="Total users" value={fmtNum(totals.users)} />
          <Tile label="Premium" value={fmtNum(totals.premium)} />
          <Tile label="DAU" value={fmtNum(totals.dau)} />
          <Tile label="New subs / wk" value={fmtNum(totals.newSubsWeek)} />
        </div>
      </div>

      {!larp && q.isLoading && <Loading label="Loading apps…" />}

      <div className="grid grid-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="card"
            onClick={() => open(r.id, r.live)}
            style={{ cursor: r.live ? 'pointer' : 'default', opacity: r.live ? 1 : 0.6 }}
          >
            <div className="row gap-12" style={{ alignItems: 'center', marginBottom: 14 }}>
              <Monogram short={r.short} color={r.color} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{r.name}</div>
                <div className="faint" style={{ fontSize: 12 }}>
                  {r.live ? 'Live' : 'Registered — backend not wired'}
                </div>
              </div>
              {r.live && <span className="badge badge-green">live</span>}
            </div>

            {r.error ? (
              <div className="muted" style={{ fontSize: 13 }}>Couldn't load — {r.error}</div>
            ) : (
              <div className="grid grid-4">
                <Tile label="Users" value={fmtNum(r.kpis?.users)} />
                <Tile label="Premium" value={fmtNum(r.kpis?.premium)} />
                <Tile label="DAU" value={fmtNum(r.kpis?.dau)} />
                <Tile label="New / wk" value={fmtNum(r.kpis?.newSubsWeek)} />
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="faint" style={{ fontSize: 12, marginTop: 16, maxWidth: 640 }}>
        Each app keeps its own backend (federated). Add one by deploying the admin function suite to its Supabase
        project + seeding the founders, then registering it in <span className="mono">src/lib/apps.ts</span> — see{' '}
        <span className="mono">MULTI-APP.md</span>. It then appears here and in the app switcher automatically.
      </p>
    </Page>
  )
}
