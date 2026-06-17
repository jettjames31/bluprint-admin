// Founder sign-in. Email + password (accounts are pre-created in Supabase).
// After sign-in the AuthProvider checks the admins allowlist; a non-founder
// sees a rejection.
import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabaseConfigured } from '@/lib/supabase'
import logo from '@/assets/logo.png'

export function Login() {
  const { signInWithPassword, isAdmin, adminCheckError, signOut, session, recheckAdmin } = useAuth()
  const [rechecking, setRechecking] = useState(false)
  async function doRecheck() {
    setRechecking(true)
    await recheckAdmin()
    setRechecking(false)
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Signed in but not a founder → explicit rejection (don't strand on a blank app).
  const rejected = !!session && isAdmin === false && !adminCheckError

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const r = await signInWithPassword(email, password)
    setBusy(false)
    if (r.error) setErr(r.error)
    // success → onAuthStateChange flips the session and the app routes away
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(900px 520px at 50% -8%, rgba(160,107,255,0.13), transparent 70%), var(--bg)',
      }}
    >
      <div style={{ width: 360 }}>
        <div className="row gap-12" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <img
            src={logo}
            alt="Bluprint"
            width={68}
            height={68}
            style={{ display: 'block', objectFit: 'contain', filter: 'drop-shadow(0 2px 14px rgba(0,0,0,0.6))' }}
          />
        </div>
        <h1 style={{ textAlign: 'center', fontSize: 22 }}>Bluprint Admin</h1>
        <p className="muted" style={{ textAlign: 'center', marginTop: 4, marginBottom: 24, fontSize: 13 }}>
          Founder access only
        </p>

        {!supabaseConfigured && (
          <div className="card" style={{ borderColor: 'var(--amber)', background: 'var(--amber-dim)' }}>
            <strong style={{ color: 'var(--amber)' }}>Not configured</strong>
            <p className="muted" style={{ marginTop: 6, marginBottom: 0, fontSize: 13 }}>
              Copy <span className="mono">.env.example</span> → <span className="mono">.env</span> and set{' '}
              <span className="mono">VITE_SUPABASE_URL</span> + <span className="mono">VITE_SUPABASE_ANON_KEY</span>.
            </p>
          </div>
        )}

        {supabaseConfigured && rejected && (
          <div className="card" style={{ borderColor: 'var(--red)', background: 'var(--red-dim)' }}>
            <strong style={{ color: 'var(--red)' }}>Access denied</strong>
            <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              This account isn't on the founder allowlist yet. Once an admin adds you, tap “Re-check access” — no need to
              sign in again.
            </p>
            <div className="row gap-8">
              <button className="btn btn-primary btn-sm" onClick={doRecheck} disabled={rechecking}>
                {rechecking ? 'Checking…' : 'Re-check access'}
              </button>
              <button className="btn btn-sm" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        )}

        {supabaseConfigured && adminCheckError && (
          <div className="card" style={{ borderColor: 'var(--amber)', background: 'var(--amber-dim)', marginBottom: 12 }}>
            <strong style={{ color: 'var(--amber)' }}>Couldn't verify access</strong>
            <p className="muted" style={{ marginTop: 6, fontSize: 12.5 }}>
              {adminCheckError} — the admin functions may not be deployed yet (see MORNING-TODO.md).
            </p>
            <button className="btn btn-sm" onClick={doRecheck} disabled={rechecking}>
              {rechecking ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        )}

        {supabaseConfigured && !rejected && (
          <div className="card">
            <form onSubmit={submit}>
              <div className="field">
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="you@bluprint.health"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: 64 }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowPw((v) => !v)}
                    style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', height: 28, padding: '0 10px' }}
                  >
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            {err && (
              <p style={{ color: 'var(--red)', fontSize: 12.5, marginTop: 14, marginBottom: 0 }}>{err}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
