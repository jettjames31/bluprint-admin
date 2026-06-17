// OVERVIEW — founder home screen. A single glance at the business: account
// counts, active-user health (DAU/WAU/MAU + stickiness), this week's new subs,
// and the operational pulse (open tickets, errors, AI volume + spend today).
// Sourced from the admin-overview function. Auto-refreshes every 60s; errors
// and open tickets get red emphasis so they can't be missed.
import { useQuery } from '@tanstack/react-query'
import { overviewApi, ApiCallError } from '@/lib/api'
import type { OverviewKpis } from '@/types'
import { Page, PageHeader } from '@/components/Layout'
import { Loading, ErrorBanner } from '@/components/ui'
import { fmtMoney, fmtNum, fmtPct, fmtRelative } from '@/lib/format'

function Stat({
  label,
  value,
  sub,
  alert,
}: {
  label: React.ReactNode
  value: React.ReactNode
  sub?: React.ReactNode
  alert?: boolean
}) {
  return (
    <div className="stat" style={alert ? { borderColor: 'var(--red)', background: 'var(--red-dim)' } : undefined}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={alert ? { color: 'var(--red)' } : undefined}>
        {value}
      </div>
      {sub != null && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function Overview() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<OverviewKpis>({
    queryKey: ['overview'],
    queryFn: () => overviewApi.kpis(),
    refetchInterval: 60_000,
  })

  const errorsHot = !!data && data.errors24h > 0
  const ticketsHot = !!data && data.openTickets > 0

  return (
    <Page>
      <PageHeader
        title="Overview"
        subtitle="The business at a glance"
        actions={
          <button className="btn" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {isLoading && <Loading label="Loading overview…" />}
      {error && <ErrorBanner message={(error as ApiCallError).message} onRetry={() => refetch()} />}

      {data && (
        <>
          <div className="grid grid-4">
            <Stat label="Users" value={fmtNum(data.users)} sub="Total accounts" />
            <Stat label="Premium" value={fmtNum(data.premium)} sub="Active entitlements" />
            <Stat label="Comped" value={fmtNum(data.comped)} sub="Founder grants" />
            <Stat label="New subs" value={fmtNum(data.newSubsWeek)} sub="Last 7 days" />
          </div>

          <div className="grid grid-4" style={{ marginTop: 14 }}>
            <Stat label="DAU" value={fmtNum(data.dau)} sub="Daily active" />
            <Stat label="WAU" value={fmtNum(data.wau)} sub="Weekly active" />
            <Stat label="MAU" value={fmtNum(data.mau)} sub="Monthly active" />
            <Stat label="DAU / MAU" value={fmtPct(data.dauMauRatio)} sub="Stickiness" />
          </div>

          <div className="grid grid-4" style={{ marginTop: 14 }}>
            <Stat
              label={
                <span className="row gap-8">
                  {ticketsHot && <span className="dot dot-red" />}
                  Open tickets
                </span>
              }
              value={fmtNum(data.openTickets)}
              sub={ticketsHot ? <span className="badge badge-red">needs attention</span> : 'All clear'}
              alert={ticketsHot}
            />
            <Stat
              label={
                <span className="row gap-8">
                  {errorsHot && <span className="dot dot-red" />}
                  Errors 24h
                </span>
              }
              value={fmtNum(data.errors24h)}
              sub={errorsHot ? <span className="badge badge-red">investigate</span> : 'No errors'}
              alert={errorsHot}
            />
            <Stat label="AI queries today" value={fmtNum(data.aiQueriesToday)} sub="Across all users" />
            <Stat label="AI cost today" value={fmtMoney(data.aiCostToday)} sub="Model spend" />
          </div>

          <div className="row faint" style={{ marginTop: 16, fontSize: 12 }}>
            as of {fmtRelative(data.checkedAt)}
          </div>
        </>
      )}
    </Page>
  )
}
