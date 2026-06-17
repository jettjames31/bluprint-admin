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
    // shouldCreateUser: true — an admin tool needs founders to be able to create
    // their auth account on first sign-in. This is NOT an access grant: the
    // `admins` allowlist (checked via admin-flags whoami after sign-in) is the
    // real gate, so a created-but-unlisted account just sees "access denied".
    try {
      // Free-tier Supabase only sends a magic LINK (templates are locked, no
      // 6-digit code), so point that link back at the dashboard's own URL — the
      // client exchanges the token on return (detectSessionInUrl). The URL must
      // be in Supabase Auth → Redirect URLs.
      const emailRedirectTo =
        typeof window !== 'undefined' ? window.location.href.split('#')[0].split('?')[0] : undefined
      const { error } = await supabase.auth.signInWithOtp({
        email: e,
        options: { shouldCreateUser: true, emailRedirectTo },
      })
      if (!error) return { error: null }
      const msg = error.message || `Couldn't send the code (status ${(error as { status?: number }).status ?? '?'}).`
      // A failing email provider surfaces as a 500 "Error sending confirmation
      // email" — make that legible instead of an empty error object.
      if (/sending|confirmation email|smtp/i.test(msg) || (error as { status?: number }).status === 500) {
        return { error: 'Could not send the login code — the email service is misconfigured (Supabase SMTP / Resend domain). Use Google sign-in, or fix email delivery.' }
      }
      return { error: msg }
    } catch (err) {
      return { error: (err as Error)?.message || 'Sign-in failed. Please try again.' }
    }
  }, [])

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const e = email.trim()
    const t = token.trim()
    // Try the standard email-OTP type first. A brand-new account's first code is
    // a "signup" confirmation token, so fall back to that type before giving up.
    const first = await supabase.auth.verifyOtp({ email: e, token: t, type: 'email' })
    if (!first.error) return { error: null }
    const second = await supabase.auth.verifyOtp({ email: e, token: t, type: 'signup' })
    if (!second.error) return { error: null }
    return { error: first.error?.message ?? 'That code didn’t work. Request a new one.' }
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
