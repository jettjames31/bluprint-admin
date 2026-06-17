// UPDATES — manual "check for updates" for the dashboard.
//
// The dashboard auto-deploys to GitHub Pages on every push, and the desktop app
// loads that same hosted URL — so an update is just a fresh page load. This page
// fetches the deployed version.json (emitted at build time by vite.config.ts),
// compares its buildId to the running __BUILD_ID__, and offers a one-tap reload
// when they differ. No reinstall, ever.
import { useState } from 'react'
import { Page, PageHeader } from '@/components/Layout'

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'current'; buildId: string; builtAt?: string }
  | { kind: 'available'; buildId: string; builtAt?: string }
  | { kind: 'error'; message: string }

const RUNNING_BUILD = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'unknown'
const RUNNING_BUILT_AT = typeof __BUILT_AT__ === 'string' ? __BUILT_AT__ : ''
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : ''

function fmt(ts?: string) {
  if (!ts) return '—'
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString()
}

export function Updates() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function check() {
    setStatus({ kind: 'checking' })
    try {
      // Cache-bust + no-store so we always see the freshest deployed manifest.
      const url = `${import.meta.env.BASE_URL}version.json?cb=${Date.now()}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Couldn't reach the update server (HTTP ${res.status}).`)
      const remote = (await res.json()) as { buildId?: string; builtAt?: string; version?: string }
      const remoteBuild = remote.buildId || 'unknown'
      if (remoteBuild !== RUNNING_BUILD) {
        setStatus({ kind: 'available', buildId: remoteBuild, builtAt: remote.builtAt })
      } else {
        setStatus({ kind: 'current', buildId: remoteBuild, builtAt: remote.builtAt })
      }
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error)?.message || 'Update check failed.' })
    }
  }

  function reload() {
    // Loads the latest deployed build (the app — desktop or web — points at the
    // hosted URL, so a reload pulls the newest assets).
    window.location.reload()
  }

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
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>
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
