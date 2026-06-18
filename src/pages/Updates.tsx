// UPDATES — manual "check for updates" for the dashboard.
//
// The dashboard auto-deploys to GitHub Pages on every push, and the desktop app
// loads that same hosted URL — so an update is just a fresh page load. This page
// compares the running build to the deployed version.json and offers a one-tap
// reload when they differ. (Shared logic in lib/useUpdateCheck.)
import { Page, PageHeader } from '@/components/Layout'
import { useUpdateCheck, RUNNING_BUILD, RUNNING_BUILT_AT, APP_VERSION } from '@/lib/useUpdateCheck'

function fmt(ts?: string) {
  if (!ts) return '—'
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString()
}

export function Updates() {
  const { status, check, reload } = useUpdateCheck()

  return (
    <Page>
      <PageHeader
        title="Updates"
        subtitle="The dashboard updates itself — check here and reload to get the latest."
        actions={
          <button className="btn btn-primary" onClick={check} disabled={status.kind === 'checking'}>
            {status.kind === 'checking' ? 'Checking…' : 'Check for updates'}
          </button>
        }
      />

      <div className="card" style={{ maxWidth: 620 }}>
        <div className="row between" style={{ alignItems: 'center' }}>
          <div>
            <div className="muted" style={{ fontSize: 12.5 }}>This build</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2 }}>
              v{APP_VERSION} <span className="mono faint" style={{ fontSize: 13 }}>({RUNNING_BUILD})</span>
            </div>
            <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>built {fmt(RUNNING_BUILT_AT)}</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
          {status.kind === 'idle' && (
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
              Tap <strong>Check for updates</strong> to see if a newer build is available.
            </p>
          )}
          {status.kind === 'checking' && (
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>Checking the update server…</p>
          )}
          {status.kind === 'current' && (
            <div className="row gap-8" style={{ alignItems: 'center' }}>
              <span className="badge badge-green">Up to date</span>
              <span className="muted" style={{ fontSize: 13 }}>You're running the latest build.</span>
            </div>
          )}
          {status.kind === 'available' && (
            <div>
              <div className="row gap-8" style={{ alignItems: 'center', marginBottom: 10 }}>
                <span className="badge badge-amber">Update available</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  New build <span className="mono">{status.buildId}</span> · {fmt(status.builtAt)}
                </span>
              </div>
              <button className="btn btn-gradient" onClick={reload}>
                Reload to update
              </button>
              <p className="faint" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
                Reloading is safe — you won't be signed out.
              </p>
            </div>
          )}
          {status.kind === 'error' && (
            <div className="row gap-8" style={{ alignItems: 'center' }}>
              <span className="badge badge-red">Couldn't check</span>
              <span className="muted" style={{ fontSize: 13 }}>{status.message}</span>
            </div>
          )}
        </div>
      </div>

      <p className="faint" style={{ fontSize: 12, marginTop: 16, maxWidth: 620 }}>
        Updates ship automatically — every change is deployed to the hosted dashboard, and the desktop app loads that
        same hosted version. There's no reinstall: just reload. (Needs an internet connection, same as the rest of the
        dashboard.)
      </p>
    </Page>
  )
}
