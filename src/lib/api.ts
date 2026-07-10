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
import { supabase } from './supabase'
import { getActiveApp, type AppDef } from './apps'
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
  AuditEntry,
  OverviewKpis,
  AnalyticsSummary,
  SubscriptionsSummary,
  UserNote,
  UserFlag,
  SafetySummary,
  CostSummary,
  ReferralCode,
  DiscountCode,
  SavedSegment,
  CannedResponse,
  CompoundVersion,
  Blend,
  AdverseEvent,
  AdvisorReport,
  MarketingReport,
  AnalysisHistoryRow,
  RelayOverview,
  RelayRevenue,
  RelaySubscriber,
  RelayLicense,
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

/** Low-level: POST to a SPECIFIC app's admin function with the founder's JWT. */
export async function callApp<T>(app: AppDef, fn: string, body: unknown = {}): Promise<T> {
  if (!app.functionsUrl) {
    throw new ApiCallError('Supabase is not configured (set VITE_SUPABASE_URL).', 0)
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ApiCallError('Not signed in.', 401)

  let res: Response
  try {
    res = await fetch(`${app.functionsUrl}/${fn}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: app.anonKey,
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

/** Low-level: POST to the ACTIVE app's admin function with the founder's JWT. */
async function call<T>(fn: string, body: unknown = {}): Promise<T> {
  if (PREVIEW) {
    const { previewResponse } = await import('./previewData')
    // tiny delay so loading states are briefly visible in the preview
    await new Promise((r) => setTimeout(r, 180))
    return previewResponse(fn, (body ?? {}) as Record<string, unknown>) as T
  }
  return callApp<T>(getActiveApp(), fn, body)
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
  setEscalated: (id: string, escalated: boolean) =>
    call<{ ticket: Ticket }>('admin-tickets', { action: 'escalate', id, escalated }),
  setTags: (id: string, tags: string[]) => call<{ ticket: Ticket }>('admin-tickets', { action: 'tags', id, tags }),
  cannedList: () => call<{ canned: CannedResponse[] }>('admin-tickets', { action: 'cannedList' }),
}

// --- AUDIT LOG ------------------------------------------------
export const auditApi = {
  list: (params: { limit?: number; action?: string; actorId?: string } = {}) =>
    call<{ entries: AuditEntry[] }>('admin-audit', { ...params }),
}

// --- OVERVIEW (home) ------------------------------------------
export const overviewApi = {
  kpis: () => call<OverviewKpis>('admin-overview', {}),
  // Per-app overview for the portfolio rollup (targets a specific app's backend). Relay is a same-project
  // product on admin-relay-overview with its own shape, so adapt it into the common OverviewKpis card shape.
  kpisFor: async (app: AppDef): Promise<OverviewKpis> => {
    if (app.kind === 'relay') {
      const o = await callApp<RelayOverview>(app, 'admin-relay-overview', {})
      return {
        users: o.customers,
        premium: o.entitlements.active,
        comped: 0,
        dau: o.engagement.dau,
        wau: o.engagement.wau,
        mau: o.engagement.mau,
        dauMauRatio: o.engagement.mau ? o.engagement.dau / o.engagement.mau : null,
        newSubsWeek: o.signups_7d,
        openTickets: 0,
        errors24h: 0,
        aiQueriesToday: 0,
        aiCostToday: null,
        checkedAt: new Date().toISOString(),
      }
    }
    return callApp<OverviewKpis>(app, 'admin-overview', {})
  },
}

// --- ANALYTICS ------------------------------------------------
export const analyticsApi = {
  summary: () => call<AnalyticsSummary>('admin-analytics', {}),
}

// --- SUBSCRIPTIONS --------------------------------------------
export const subscriptionsApi = {
  summary: () => call<SubscriptionsSummary>('admin-subscriptions', {}),
}

// --- USER NOTES / FLAGS ---------------------------------------
export const notesApi = {
  list: (userId: string) =>
    call<{ notes: UserNote[]; flags: UserFlag[] }>('admin-notes', { action: 'list', userId }),
  addNote: (userId: string, body: string) =>
    call<{ note: UserNote }>('admin-notes', { action: 'addNote', userId, body }),
  addFlag: (userId: string, flag: string, reason?: string) =>
    call<{ flag: UserFlag }>('admin-notes', { action: 'addFlag', userId, flag, reason }),
  resolveFlag: (id: string) => call<{ resolved: boolean }>('admin-notes', { action: 'resolveFlag', id }),
}

// --- GDPR EXPORT / VIEW-AS / STATE INSPECTOR ------------------
export const exportApi = {
  user: (userId: string) => call<{ export: Record<string, unknown> }>('admin-export', { action: 'export', userId }),
  state: (userId: string) =>
    call<{ state: Record<string, unknown> }>('admin-export', { action: 'state', userId }),
}

// --- AI SAFETY / ADVERSE / FEEDBACK ---------------------------
export const safetyApi = {
  summary: () => call<SafetySummary>('admin-safety', { action: 'summary' }),
  resolveAdverse: (id: string, status: string) =>
    call<{ adverse: AdverseEvent }>('admin-safety', { action: 'resolveAdverse', id, status }),
}

// --- AI COST --------------------------------------------------
export const costApi = {
  summary: () => call<CostSummary>('admin-cost', {}),
}

// --- AI ADVISOR -----------------------------------------------
export const advisorApi = {
  analyze: (model: string) => call<AdvisorReport>('admin-advisor', { model }),
  history: () => call<{ reports: AnalysisHistoryRow[] }>('admin-advisor', { action: 'history' }),
  get: (id: string) => call<AdvisorReport>('admin-advisor', { action: 'get', id }),
}

// --- AI MARKETING ---------------------------------------------
export const marketingApi = {
  analyze: (params: { model: string; category?: string; product?: string; audience?: string; notes?: string }) =>
    call<MarketingReport>('admin-marketing', params),
  history: () => call<{ reports: AnalysisHistoryRow[] }>('admin-marketing', { action: 'history' }),
  get: (id: string) => call<MarketingReport>('admin-marketing', { action: 'get', id }),
}

// --- GROWTH ---------------------------------------------------
export const growthApi = {
  referrals: () => call<{ codes: ReferralCode[] }>('admin-growth', { action: 'referralList' }),
  createReferral: (code: string, ownerLabel?: string) =>
    call<{ code: ReferralCode }>('admin-growth', { action: 'referralCreate', code, ownerLabel }),
  discounts: () => call<{ codes: DiscountCode[] }>('admin-growth', { action: 'discountList' }),
  createDiscount: (d: Partial<DiscountCode>) =>
    call<{ code: DiscountCode }>('admin-growth', { action: 'discountCreate', discount: d }),
  segments: () => call<{ segments: SavedSegment[] }>('admin-growth', { action: 'segmentList' }),
  createSegment: (name: string, definition: Record<string, unknown>) =>
    call<{ segment: SavedSegment }>('admin-growth', { action: 'segmentCreate', name, definition }),
  canned: () => call<{ canned: CannedResponse[] }>('admin-growth', { action: 'cannedList' }),
  createCanned: (title: string, body: string) =>
    call<{ canned: CannedResponse }>('admin-growth', { action: 'cannedCreate', title, body }),
}

// --- BLENDS (CMS) ---------------------------------------------
export const blendsApi = {
  list: () => call<{ blends: Blend[]; source: string }>('admin-blends', { action: 'list' }),
  upsert: (blend: Blend) => call<{ blend: Blend }>('admin-blends', { action: 'upsert', blend }),
  toggle: (id: string, hidden: boolean) => call<{ blend: Blend }>('admin-blends', { action: 'toggle', id, hidden }),
  remove: (id: string) => call<{ deleted: boolean }>('admin-blends', { action: 'delete', id }),
}

// --- COMPOUND AI DRAFT (smart add) ----------------------------
export const compoundSuggestApi = {
  suggest: (name: string, model: string) =>
    call<{ draft: Compound; model: string }>('admin-compound-suggest', { name, model }),
}

// --- COMPOUND VERSION HISTORY (extends compoundsApi) ----------
export const compoundVersionsApi = {
  list: (id: string) => call<{ versions: CompoundVersion[] }>('admin-compounds', { action: 'versions', id }),
  restore: (id: string, versionId: string) =>
    call<{ compound: Compound }>('admin-compounds', { action: 'restore', id, versionId }),
}

/** Is the signed-in user actually a founder? (admin-flags self-check.) */
export const meApi = {
  whoami: () => call<{ isAdmin: boolean; role: string | null; email: string | null }>('admin-flags', { action: 'whoami' }),
}

// --- RELAY (the commercial desktop product; same project, admin-relay-* fns) ---
export const relayApi = {
  overview: () => call<RelayOverview>('admin-relay-overview'),
  revenue: () => call<RelayRevenue>('admin-relay-revenue'),
  subscribers: (params: { status?: string; limit?: number } = {}) =>
    call<{ subscribers: RelaySubscriber[]; count: number }>('admin-relay-subscribers', params),
  licenses: {
    list: () => call<{ licenses: RelayLicense[] }>('admin-relay-licenses', { action: 'list' }),
    create: (params: { kind?: string; owner_label?: string; max_devices?: number; note?: string } = {}) =>
      call<{ license: RelayLicense }>('admin-relay-licenses', { action: 'create', ...params }),
    revoke: (key: string) => call<{ ok: boolean }>('admin-relay-licenses', { action: 'revoke', key }),
  },
}
