// LARP MODE — a client-only, on-this-device cosmetic toggle that overlays the
// charts/KPIs with gloriously fake hockey-stick numbers. Persisted to
// localStorage; never touches the backend or real data. Read via useLarp().
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const KEY = 'bp-admin-larp'

interface LarpValue {
  larp: boolean
  setLarp: (v: boolean) => void
}

const Ctx = createContext<LarpValue>({ larp: false, setLarp: () => {} })

export function LarpProvider({ children }: { children: ReactNode }) {
  const [larp, setLarpState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  const setLarp = useCallback((v: boolean) => {
    setLarpState(v)
    try {
      localStorage.setItem(KEY, v ? '1' : '0')
    } catch {
      /* private mode / storage disabled — in-memory only */
    }
  }, [])
  return <Ctx.Provider value={{ larp, setLarp }}>{children}</Ctx.Provider>
}

export function useLarp() {
  return useContext(Ctx)
}
