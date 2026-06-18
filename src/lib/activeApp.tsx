// React layer over the module-level active-app state (lib/apps). Gives the UI
// reactivity + invalidates cached queries on switch so every page refetches
// against the newly selected app's backend.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { APPS, getActiveApp, setActiveAppId, type AppDef } from './apps'

interface ActiveAppValue {
  app: AppDef
  apps: AppDef[]
  setApp: (id: string) => void
}

const Ctx = createContext<ActiveAppValue | null>(null)

export function ActiveAppProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [app, setAppState] = useState<AppDef>(() => getActiveApp())

  const setApp = useCallback(
    (id: string) => {
      setActiveAppId(id)
      setAppState(getActiveApp())
      // Drop cached data so each page refetches against the new app's backend.
      qc.clear()
    },
    [qc],
  )

  return <Ctx.Provider value={{ app, apps: APPS, setApp }}>{children}</Ctx.Provider>
}

export function useActiveApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useActiveApp must be used within ActiveAppProvider')
  return v
}
