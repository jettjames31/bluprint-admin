// LARP MODE — a client-only, on-this-device cosmetic toggle that overlays the
// charts/KPIs with gloriously fake hockey-stick numbers. Persisted to
// localStorage. The `seed` drives the generated figures (lib/larpData) and is
// re-rolled on every login / page load / toggle-on, so the numbers are DIFFERENT
// every time you log in — but stable within a session (no flicker).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

const KEY = 'bp-admin-larp'
const makeSeed = () => Math.floor(Math.random() * 2 ** 31)

interface LarpValue {
  larp: boolean
  setLarp: (v: boolean) => void
  seed: number
  reroll: () => void
}

const Ctx = createContext<LarpValue>({ larp: false, setLarp: () => {}, seed: 1, reroll: () => {} })

export function LarpProvider({ children }: { children: ReactNode }) {
  const [larp, setLarpState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  // Fresh seed per page load — so opening the app (and logging in) gives new numbers.
  const [seed, setSeed] = useState<number>(() => makeSeed())
  const reroll = useCallback(() => setSeed(makeSeed()), [])

  const setLarp = useCallback((v: boolean) => {
    setLarpState(v)
    if (v) setSeed(makeSeed()) // re-roll each time it's switched on
    try {
      localStorage.setItem(KEY, v ? '1' : '0')
    } catch {
      /* private mode — in-memory only */
    }
  }, [])

  // Re-roll on an explicit sign-in (fires on login, NOT on session-restore or
  // token-refresh), so signing out and back in shows a fresh set of numbers.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') setSeed(makeSeed())
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ larp, setLarp, seed, reroll }}>{children}</Ctx.Provider>
}

export function useLarp() {
  return useContext(Ctx)
}
