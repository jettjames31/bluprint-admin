// Shared update-check logic for the Updates tab and the Settings "check for
// updates" button. Compares the build baked into the running bundle
// (__BUILD_ID__) against the deployed version.json, which GitHub Pages
// republishes on every push. A reload pulls the newest build (the app loads the
// hosted URL), so "update" = reload.
import { useCallback, useState } from 'react'

export const RUNNING_BUILD = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'unknown'
export const RUNNING_BUILT_AT = typeof __BUILT_AT__ === 'string' ? __BUILT_AT__ : ''
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : ''

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'current'; buildId: string; builtAt?: string }
  | { kind: 'available'; buildId: string; builtAt?: string }
  | { kind: 'error'; message: string }

export function useUpdateCheck() {
  const [status, setStatus] = useState<UpdateStatus>({ kind: 'idle' })

  const check = useCallback(async () => {
    setStatus({ kind: 'checking' })
    try {
      const url = `${import.meta.env.BASE_URL}version.json?cb=${Date.now()}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Couldn't reach the update server (HTTP ${res.status}).`)
      const remote = (await res.json()) as { buildId?: string; builtAt?: string }
      const buildId = remote.buildId || 'unknown'
      setStatus(
        buildId !== RUNNING_BUILD
          ? { kind: 'available', buildId, builtAt: remote.builtAt }
          : { kind: 'current', buildId, builtAt: remote.builtAt },
      )
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error)?.message || 'Update check failed.' })
    }
  }, [])

  const reload = useCallback(() => window.location.reload(), [])

  return { status, check, reload }
}
