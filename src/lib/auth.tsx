// ============================================================
// Founder auth context.
//
// Wraps Supabase email+password auth. Accounts are pre-created (one per
// founder) in Supabase Auth; there is no self-signup. After sign-in we call
// admin-flags{whoami} to confirm the user is in the `admins` allowlist; a
// signed-in non-founder is rejected (signed out).
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from './supabase'
import { meApi, ApiCallError } from './api'

interface AuthValue {
  ready: boolean
  session: Session | null
  email: string | null
  isAdmin: boolean | null // null = not yet checked
  role: string | null
  adminCheckError: string | null
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  recheckAdmin: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [adminCheckError, setAdminCheckError] = useState<string | null>(null)

  const checkAdmin = useCallback(async () => {
    setAdminCheckError(null)
    try {
      const r = await meApi.whoami()
      setIsAdmin(!!r.isAdmin)
      setRole(r.role)
    } catch (e) {
      // A 401/403 means "not a founder" — a clean, expected rejection.
      // Anything else (network / function not deployed) is surfaced so the
      // morning deploy step is obvious rather than looking like a denied login.
      const err = e as ApiCallError
      setIsAdmin(false)
      setRole(null)
      if (err.status !== 401 && err.status !== 403) {
        setAdminCheckError(err.message || 'Could not verify admin access.')
      }
    }
  }, [])

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(data.session ?? null)
      if (data.session) await checkAdmin()
      setReady(true)
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (s) checkAdmin()
      else {
        setIsAdmin(null)
        setRole(null)
      }
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [checkAdmin])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const e = email.trim()
    if (!EMAIL_RE.test(e)) return { error: 'Enter a valid email address.' }
    if (!password) return { error: 'Enter your password.' }
    // Accounts are pre-created in Supabase Auth (no self-signup). A wrong email
    // or password surfaces as "Invalid login credentials"; the `admins`
    // allowlist (checked via whoami after sign-in) is the real access gate, so a
    // valid-but-unlisted account just sees "access denied" after this succeeds.
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password })
      if (!error) return { error: null }
      const msg = error.message || 'Sign-in failed. Please try again.'
      if (/invalid login credentials/i.test(msg)) {
        return { error: 'Incorrect email or password.' }
      }
      return { error: msg }
    } catch (err) {
      return { error: (err as Error)?.message || 'Sign-in failed. Please try again.' }
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setIsAdmin(null)
    setRole(null)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      email: session?.user?.email ?? null,
      isAdmin,
      role,
      adminCheckError,
      signInWithPassword,
      signOut,
      recheckAdmin: checkAdmin,
    }),
    [ready, session, isAdmin, role, adminCheckError, signInWithPassword, signOut, checkAdmin],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
