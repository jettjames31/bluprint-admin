// ============================================================
// Admin API client.
//
// Thin typed wrappers over the admin-* Supabase Edge Functions. Every call
// attaches the signed-in founder's JWT (from the supabase session) as the
// bearer token + the public anon key as `apikey` — mirroring the Bluprint
// app's aiHeaders(). The functions themselves verify the caller is a founder
// (admins allowlist) before doing anything privileged with the service role.
//
// The dashboard NEVER sees the service-role key.
// ============================================================
import { supabase, FUNCTIONS_URL, ANON_KEY } from './supabase'
import type {
  AdminUser,
  AdminRecord,
  Announcement,
  AppHealth,
  AiUsageSummary,
  AiQuery,
  Compound,
  ConsentVersion,
  ErrorLogEntry,
  FeatureFlag,
  Lead,
  LeadStatus,
  LeadType,
  PushLogEntry,
  RevenueMetrics,
  Segment,
  Ticket,
  TicketMessage,
} from '@/types'

export class ApiCallError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiCallError'
  }
}

// Dev-only design preview: serve canned sample data instead of calling the
// backend. Gated on import.meta.env.DEV so it's stripped from production builds;
// previewData is dynamically imported so it never enters the prod bundle.
const PREVIEW = import.meta.env.DEV && import.meta.env.VITE_PREVIEW === '1'

/** Low-level: POST to an admin function with the founder's JWT. */
async function call<T>(fn: string, body: unknown = {}): Promise<T> {
  if (PREVIEW) {
    const { previewResponse } = await import('./previewData')
    // tiny delay so loading states are briefly visible in the preview
    await new Promise((r) => setTimeout(r, 180))
    return previewResponse(fn, (body ?? {}) as Record<string, unknown>) as T
  }
  if (!FUNCTIONS_URL) {
    throw new ApiCallError('Supabase is not configured (set VITE_SUPABASE_URL).', 0)
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ApiCallError('Not signed in.', 401)

  let res: Response
  try {
    res = await fetch(`${FUNCTIONS_URL}/${fn}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(body ?? {}),
    })
  } catch {
    throw new ApiCallError('Network error — could not reach the server.', 0)
  }

  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    /* empty/non-JSON body */
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    if (json && typeof json === 'object' && 'error' in json) {
      msg = String((json as { error: unknown }).error)
    }
    throw new ApiCallError(msg, res.status)
  }
  return json as T
}

// --- USERS ----------------------------------------------------
export const usersApi = {
  list: (params: { search?: string; limit?: number; offset?: number } = {}) =>
    call<{ users: AdminUser[]; total: number }>('admin-users', { action: 'list', ...params }),
  get: (userId: string) => call<{ user: AdminUser }>('admin-users', { action: 'get', userId }),
  delete: (userId: string) => call<{ deleted: boolean }>('admin-delete-user', { userId }),
  grantPremium: (params: { userId: string; expiresAt?: string | null; reason?: string }) =>
    call<{ granted: boolean }>('admin-grant-premium', params),
  revokePremium: (userId: string) =>
    call<{ revoked: boolean }>('admin-grant-premium', { userId, revoke: true }),
}

// --- REVENUE --------------------------------------------------
export const revenueApi = {
  metrics: () => call<RevenueMetrics>('admin-revenue', { action: 'metrics' }),
}

// --- AI MONITORING --------------------------------------------
export const aiApi = {
  usage: () => call<AiUsageSummary>('admin-users', { action: 'aiUsage' }),
  queries: (params: { limit?: number; userId?: string } = {}) =>
    call<{ queries: AiQuery[]; enabled: boolean }>('admin-ai-queries', params),
}

// --- APP HEALTH -----------------------------------------------
export const healthApi = {
  status: () => call<AppHealth>('admin-health', {}),
  errors: (limit = 100) => call<{ errors: ErrorLogEntry[] }>('admin-health', { action: 'errors', limit }),
}

// --- LEADS ----------------------------------------------------
export const leadsApi = {
  list: (params: { type?: LeadType; status?: LeadStatus } = {}) =>
    call<{ leads: Lead[] }>('admin-leads', { action: 'list', ...params }),
  create: (lead: Partial<Lead>) => call<{ lead: Lead }>('admin-leads', { action: 'create', lead }),
  update: (id: string, patch: Partial<Lead>) =>
    call<{ lead: Lead }>('admin-leads', { action: 'update', id, patch }),
  remove: (id: string) => call<{ deleted: boolean }>('admin-leads', { action: 'delete', id }),
  invite: (ids: string[]) =>
    call<{ invited: number; failed: number }>('admin-invite-leads', { ids }),
}

// --- ANNOUNCEMENTS --------------------------------------------
export const announcementsApi = {
  list: () => call<{ announcements: Announcement[] }>('admin-announcements', { action: 'list' }),
  create: (a: Partial<Announcement>) =>
    call<{ announcement: Announcement }>('admin-announcements', { action: 'create', announcement: a }),
  update: (id: string, patch: Partial<Announcement>) =>
    call<{ announcement: Announcement }>('admin-announcements', { action: 'update', id, patch }),
  remove: (id: string) => call<{ deleted: boolean }>('admin-announcements', { action: 'delete', id }),
}

// --- PUSH -----------------------------------------------------
export const pushApi = {
  send: (params: { title: string; body: string; segment: Segment; userId?: string }) =>
    call<{ sent: number; ok: number; errors: number }>('admin-send-push', params),
  history: () => call<{ log: PushLogEntry[] }>('admin-send-push', { action: 'history' }),
}

// --- FEATURE FLAGS / CONFIG -----------------------------------
export const flagsApi = {
  list: () => call<{ flags: FeatureFlag[] }>('admin-flags', { action: 'list' }),
  set: (key: string, value: unknown, description?: string) =>
    call<{ flag: FeatureFlag }>('admin-flags', { action: 'set', key, value, description }),
  remove: (key: string) => call<{ deleted: boolean }>('admin-flags', { action: 'delete', key }),
}

// --- CONSENT --------------------------------------------------
export const consentApi = {
  list: () => call<{ versions: ConsentVersion[] }>('admin-flags', { action: 'consentList' }),
  publish: (kind: string, body: string) =>
    call<{ version: ConsentVersion }>('admin-flags', { action: 'consentPublish', kind, body }),
}

// --- ADMINS (settings) ----------------------------------------
export const adminsApi = {
  list: () => call<{ admins: AdminRecord[] }>('admin-flags', { action: 'adminsList' }),
  add: (email: string, role?: string) =>
    call<{ admin: AdminRecord }>('admin-flags', { action: 'adminsAdd', email, role }),
  remove: (userId: string) => call<{ deleted: boolean }>('admin-flags', { action: 'adminsRemove', userId }),
}

// --- COMPOUNDS (CMS) ------------------------------------------
export const compoundsApi = {
  list: () => call<{ compounds: Compound[]; source: string }>('admin-compounds', { action: 'list' }),
  upsert: (compound: Compound) =>
    call<{ compound: Compound }>('admin-compounds', { action: 'upsert', compound }),
  toggle: (id: string, hidden: boolean) =>
    call<{ compound: Compound }>('admin-compounds', { action: 'toggle', id, hidden }),
  remove: (id: string) => call<{ deleted: boolean }>('admin-compounds', { action: 'delete', id }),
}

// --- TICKETS (V2) ---------------------------------------------
export const ticketsApi = {
  list: (status?: string) => call<{ tickets: Ticket[]; openCount: number }>('admin-tickets', { action: 'list', status }),
  get: (id: string) =>
    call<{ ticket: Ticket; messages: TicketMessage[] }>('admin-tickets', { action: 'get', id }),
  reply: (id: string, body: string, internal = false) =>
    call<{ message: TicketMessage }>('admin-tickets', { action: 'reply', id, body, internal }),
  setStatus: (id: string, status: string) =>
    call<{ ticket: Ticket }>('admin-tickets', { action: 'status', id, status }),
  setPriority: (id: string, priority: string) =>
    call<{ ticket: Ticket }>('admin-tickets', { action: 'priority', id, priority }),
}

/** Is the signed-in user actually a founder? (admin-flags self-check.) */
export const meApi = {
  whoami: () => call<{ isAdmin: boolean; role: string | null; email: string | null }>('admin-flags', { action: 'whoami' }),
}
