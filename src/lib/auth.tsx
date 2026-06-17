// ============================================================
// Founder auth context.
//
// Wraps Supabase auth (email OTP + Google OAuth — same providers the app
// uses). After sign-in we call admin-flags{whoami} to confirm the user is in
// the `admins` allowlist; a signed-in non-founder is rejected (signed out).
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
  signInWithEmail: (email: string) => Promise<{ error: string | null }>
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
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

  const signInWithEmail = useCallback(async (email: string) => {
    const e = email.trim()
    if (!EMAIL_RE.test(e)) return { error: 'Enter a valid email address.' }
    const { error } = await supabase.auth.signInWithOtp({ email: e, options: { shouldCreateUser: false } })
    return { error: error?.message ?? null }
  }, [])

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' })
    return { error: error?.message ?? null }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    return { error: error?.message ?? null }
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
      signInWithEmail,
      verifyEmailOtp,
      signInWithGoogle,
      signOut,
      recheckAdmin: checkAdmin,
    }),
    [ready, session, isAdmin, role, adminCheckError, signInWithEmail, verifyEmailOtp, signInWithGoogle, signOut, checkAdmin],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
