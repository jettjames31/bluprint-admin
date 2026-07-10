// ============================================================
// App registry — the multi-app control plane.
//
// The dashboard is federated: each app keeps its OWN backend (Supabase project
// + RevenueCat), and this registry lists the apps the dashboard can drive. The
// active app determines which backend every page + the API client talk to;
// switching apps re-points everything with no code change. A game and a health
// app never share a schema — each just implements the common admin-* function
// contract so the per-app pages + the portfolio rollup work uniformly.
//
// Adding an app: deploy the admin-* function suite to its Supabase project +
// seed the founders into its `admins` table, then add an AppDef entry here.
// See MULTI-APP.md.
// ============================================================
import { SUPABASE_URL, ANON_KEY, FUNCTIONS_URL } from './supabase'

export interface AppDef {
  id: string
  name: string
  short: string // 1–2 char monogram for the switcher/portfolio
  color: string // accent (CSS var or hex)
  supabaseUrl: string
  anonKey: string // public anon key (ships in the client by design)
  functionsUrl: string
  live: boolean // backend deployed + founders seeded (false = registered, not wired)
  // 'standard' apps implement the common admin-* contract with their OWN Supabase project. 'relay' is a
  // same-project product (shares Bluprint's backend) exposed through admin-relay-* functions + its own nav.
  kind?: 'standard' | 'relay'
  home?: string // the route to land on when this app is selected in the switcher (default '/')
}

// App #1 — Bluprint. The HOME app: founder auth + the allowlist live in this
// project, built from the dashboard's env (VITE_SUPABASE_*).
const bluprint: AppDef = {
  id: 'bluprint',
  name: 'Bluprint Health',
  short: 'B',
  color: 'var(--purple)',
  supabaseUrl: SUPABASE_URL,
  anonKey: ANON_KEY,
  functionsUrl: FUNCTIONS_URL,
  live: true,
  kind: 'standard',
  home: '/',
}

// App #2 — Relay OS (the commercial desktop product). It SHARES Bluprint's Supabase project (same
// url/anon/functions), but its data lives in relay_* tables behind admin-relay-* functions, so it gets its
// own nav + pages (kind: 'relay'). Founder auth is the same allowlist, so no separate sign-in.
const relay: AppDef = {
  id: 'relay',
  name: 'Relay',
  short: 'R',
  color: 'var(--blue)',
  supabaseUrl: SUPABASE_URL,
  anonKey: ANON_KEY,
  functionsUrl: FUNCTIONS_URL,
  live: true,
  kind: 'relay',
  home: '/relay',
}

// The home/control app — founder sign-in happens here.
export const HOME_APP = bluprint

// The registry. Append new apps here (each needs the admin-* suite + seeded founders).
export const APPS: AppDef[] = [bluprint, relay]

export function getAppById(id: string | null | undefined): AppDef {
  return APPS.find((a) => a.id === id) ?? HOME_APP
}

// --- Active app (module-level so the non-React API client can read it) -------
const STORAGE_KEY = 'bp-admin-active-app'

let _activeId: string = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) || HOME_APP.id
  } catch {
    return HOME_APP.id
  }
})()
if (!APPS.some((a) => a.id === _activeId)) _activeId = HOME_APP.id

export function getActiveApp(): AppDef {
  return getAppById(_activeId)
}

export function setActiveAppId(id: string) {
  _activeId = getAppById(id).id
  try {
    localStorage.setItem(STORAGE_KEY, _activeId)
  } catch {
    /* private mode — in-memory only */
  }
}
