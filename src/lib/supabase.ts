// ============================================================
// Supabase client for the admin dashboard.
//
// Uses ONLY the public anon key (same key the Bluprint app ships). The
// dashboard never holds the service-role key — every privileged operation
// goes through an admin-* Edge Function that verifies the caller is a founder
// (the `admins` allowlist) before using the service role server-side.
//
// The anon client here is used for: (1) founder auth (email OTP / Google),
// (2) attaching the founder's JWT to admin-* function calls.
// ============================================================
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL || ''
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabaseConfigured = !!(URL && ANON)

if (!supabaseConfigured) {
  // Loud, early signal in dev — the app renders a config error screen too.
  console.error(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Copy .env.example to .env and fill them in.',
  )
}

export const supabase = createClient(URL, ANON, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

export const SUPABASE_URL = URL
export const ANON_KEY = ANON

// Base URL for Edge Functions. Override with VITE_FUNCTIONS_URL if needed.
export const FUNCTIONS_URL =
  import.meta.env.VITE_FUNCTIONS_URL || (URL ? `${URL}/functions/v1` : '')
