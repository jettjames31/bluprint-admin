// ============================================================
// Shared data contracts for the Bluprint admin dashboard.
//
// These mirror (a) the Supabase table schemas in
// bluprint-health/supabase/migrations and (b) the JSON shapes the
// admin-* Edge Functions return. Keep them in sync with both.
// ============================================================

// --- USERS ----------------------------------------------------

/** The user's `bp.profile.v1` value JSON (from user_state). All optional —
 *  a brand-new account may have synced nothing yet. */
export interface Profile {
  name?: string
  goalCategory?: string
  goalLabel?: string
  experience?: string
  gender?: string
  units?: string
  heightIn?: number
  targetWeight?: number
  targetBodyFat?: number
  healthFlags?: string[]
  physician?: string
  birthday?: string
  onboarded?: boolean
}

/** Plan status resolved from RevenueCat / entitlements. */
export type PlanStatus = 'free' | 'trial' | 'monthly' | 'annual' | 'premium' | 'unknown'

/** A merged user row: auth.users + their profile + entitlement, as returned
 *  by the `admin-users` function. */
export interface AdminUser {
  id: string
  email: string | null
  phone: string | null
  provider: string | null
  createdAt: string | null // auth.users.created_at (sign-up date)
  lastSignInAt: string | null // auth.users.last_sign_in_at
  lastActiveAt: string | null // approx: max(user_state.updated_at)
  profile: Profile | null
  entitlement: EntitlementRow | null
  // Optional plan info enriched from RevenueCat when available.
  plan?: PlanStatus
  trialStart?: string | null
  trialEnd?: string | null
  // True when this user is also a dashboard admin/founder — protected from
  // deletion (the Users page hides delete; admin-delete-user blocks it server-side).
  isAdmin?: boolean
  adminRole?: string | null
}

export interface EntitlementRow {
  user_id: string
  entitlement: string
  active: boolean
  expires_at: string | null
  product_id: string | null
  granted_by?: string | null
  reason?: string | null
  updated_at: string
}

// --- ADMINS ---------------------------------------------------

export interface AdminRecord {
  user_id: string
  email: string | null
  role: string
  added_by: string | null
  added_at: string
}

// --- LEADS ----------------------------------------------------

export type LeadType = 'waitlist' | 'tester'
export type LeadStatus =
  | 'waitlist'
  | 'invited'
  | 'converted'
  | 'dead'
  | 'applied'
  | 'accepted'
  | 'active'
  | 'dropped'

export interface Lead {
  id: string
  name: string | null
  email: string
  source: string | null
  status: LeadStatus
  notes: string | null
  instagram_handle: string | null
  type: LeadType
  created_at: string
  invited_at: string | null
  converted_at: string | null
}

// --- ANNOUNCEMENTS --------------------------------------------

export type Segment = 'all' | 'free' | 'trial' | 'premium'

export interface Announcement {
  id: string
  title: string
  body: string
  segment: Segment
  active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  created_by: string | null
}

// --- PUSH -----------------------------------------------------

export interface PushToken {
  user_id: string
  token: string
  platform: string | null
  updated_at: string
}

export interface PushLogEntry {
  id: string
  title: string
  body: string
  segment: Segment
  target_user_id: string | null
  sent_count: number
  ok_count: number
  error_count: number
  created_at: string
  created_by: string | null
}

// --- FEATURE FLAGS / CONFIG -----------------------------------

export interface FeatureFlag {
  key: string
  value: unknown // jsonb — bool, number, string, or object
  description: string | null
  updated_at: string
  updated_by: string | null
}

// --- CONSENT --------------------------------------------------

export interface ConsentVersion {
  id: string
  kind: string // e.g. 'ai' | 'tos' | 'privacy'
  version: number
  body: string
  active: boolean
  created_at: string
  created_by: string | null
}

// --- AI MONITORING --------------------------------------------

/** Aggregate AI usage from rate_limits buckets (counts only — no content). */
export interface AiUsageSummary {
  today: number
  week: number
  month: number
  byUser: { user_id: string; count: number; email?: string | null }[]
  highUsage: { user_id: string; count: number; email?: string | null }[]
}

/** A row from the (privacy-gated, off-by-default) ai_queries content log. */
export interface AiQuery {
  id: string
  user_id: string | null
  mode: string | null
  question: string
  response: string | null
  created_at: string
}

// --- APP HEALTH -----------------------------------------------

export interface ErrorLogEntry {
  id: string
  fn: string | null
  kind: string | null
  message: string
  user_id: string | null
  created_at: string
}

export interface AppHealth {
  supabase: { ok: boolean; latencyMs: number | null }
  revenuecatWebhook: { lastEventAt: string | null; ok: boolean }
  activeUsers: { last24h: number; last7d: number }
  errors24h: number
  checkedAt: string
}

// --- REVENUE (RevenueCat) -------------------------------------

export interface RevenueMetrics {
  configured: boolean // false when the RevenueCat key isn't set yet
  totalSubscribers: number | null
  activeSubscribers: number | null
  trials: number | null
  mrr: number | null
  arr: number | null
  freeCount: number | null
  paidCount: number | null
  churnRate: number | null
  newThisWeek: number | null
  newThisMonth: number | null
  revenueSeries: { date: string; value: number }[]
  // Local subscription activity (last 30d) from the webhook feed — present even
  // when RevenueCat isn't connected, so the page always has a chart.
  activitySeries: { date: string; new: number; renewal: number; churn: number }[]
  // Booked revenue over rolling windows (from the webhook feed).
  periodRevenue: { week: number; month: number; year: number }
  note?: string
}

// --- AI ADVISOR -----------------------------------------------
export interface AnalysisHistoryRow {
  id: string
  model: string
  created_at: string
  summary: string
}
export type AdvisorModel = 'claude-haiku-4-5' | 'claude-sonnet-4-6' | 'claude-opus-4-8'
export interface AdvisorReport {
  headline: string
  stage: string
  confidence: string
  redFlags: { issue: string; severity: 'high' | 'medium' | 'low'; why: string }[]
  working: string[]
  trends: { label: string; direction: 'up' | 'down' | 'flat'; note: string }[]
  benchmarks: { metric: string; you: string; benchmark: string; verdict: string }[]
  recommendations: { action: string; priority: number; effort: 'S' | 'M' | 'L'; rationale: string }[]
  oneThing: string
  model: string
  generatedAt: string
  id?: string
  digest?: Record<string, unknown>
}

// --- AI MARKETING ---------------------------------------------
export interface MarketingReport {
  category: string
  positioning: string
  confidence: string
  competitors: { name: string; angle: string; channels: string; working: string; gap: string }[]
  whatsWorkingInCategory: string[]
  whatsNotWorkingForUs: { issue: string; why: string; fix: string }[]
  channels: { channel: string; priority: number; why: string; firstStep: string }[]
  angles: { hook: string; audience: string; format: string }[]
  aso: { keywords: string[]; titleIdeas: string[] }
  quickWins: string[]
  bigBets: string[]
  oneThing: string
  model: string
  generatedAt: string
  id?: string
  digest?: Record<string, unknown>
}

// --- COMPOUNDS (CMS) ------------------------------------------

export type ResearchBadge =
  | 'Preclinical'
  | 'Early Clinical'
  | 'Clinical'
  | 'FDA Approved'
  | 'Dev Abandoned'

export interface Compound {
  id: string
  name: string
  aka?: string[]
  primaryCategory?: string
  categories?: string[]
  researchStatusBadge?: ResearchBadge | string
  researchStatusFull?: string
  wada?: string
  oneLiner?: string
  whatItIs?: string
  howItWorks?: string
  benefits?: string[]
  sideEffects?: string[]
  legalStatus?: string
  researchedAlongside?: string[]
  residues?: number
  nonPeptide?: boolean
  sequence?: string // amino-acid sequence (peptides)
  molecularFormula?: string
  hidden?: boolean
  source?: 'bundled' | 'server'
  updated_at?: string
}

// --- SUPPORT (V2) ---------------------------------------------

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'normal' | 'urgent'

export interface Ticket {
  id: string
  user_id: string | null
  subject: string
  body: string
  status: TicketStatus
  priority: TicketPriority
  created_at: string
  updated_at: string
  // enriched
  email?: string | null
  messageCount?: number
}

export interface TicketMessage {
  id: string
  ticket_id: string
  author: 'user' | 'admin'
  author_id: string | null
  body: string
  internal: boolean
  created_at: string
}

// --- AUDIT LOG ------------------------------------------------
export interface AuditEntry {
  id: string
  actor_id: string | null
  actor_email: string | null
  action: string
  target_type: string | null
  target_id: string | null
  reason: string | null
  meta: Record<string, unknown>
  created_at: string
}

// --- OVERVIEW (home KPIs) -------------------------------------
export interface OverviewKpis {
  users: number
  premium: number
  comped: number
  dau: number
  wau: number
  mau: number
  dauMauRatio: number | null
  newSubsWeek: number | null
  openTickets: number
  errors24h: number
  aiQueriesToday: number
  aiCostToday: number | null
  checkedAt: string
}

// --- ANALYTICS ------------------------------------------------
export interface Distribution {
  label: string
  count: number
}
export interface AnalyticsSummary {
  dau: number
  wau: number
  mau: number
  dauMauRatio: number | null
  goals: Distribution[]
  experience: Distribution[]
  genders: Distribution[]
  healthFlagRate: number | null
  physicianRate: number | null
  topBookmarked: { id: string; count: number }[]
  topSearched: { query: string; count: number }[]
  emptySearches: { query: string; count: number }[]
  scanMisses: { value: string; count: number }[]
  trending: { query: string; count: number; prev: number }[]
  stackGraph: { a: string; b: string; count: number }[]
  highRiskWatch: { user_id: string; email: string | null; flags: string[]; compounds: string[] }[]
  funnel: { step: string; count: number }[]
  retention: { d1: number | null; d7: number | null; d30: number | null }
  featureAdoption: { feature: string; pct: number }[]
  heatmap: { dow: number; hour: number; count: number }[]
  note?: string
}

// --- SUBSCRIPTIONS (events / refunds / at-risk / comps) -------
export interface SubscriptionEvent {
  id: string
  user_id: string | null
  email?: string | null
  type: string
  product_id: string | null
  store: string | null
  price: number | null
  currency: string | null
  environment: string | null
  event_at: string | null
}
export interface CompedUser {
  user_id: string
  email: string | null
  reason: string | null
  granted_by: string | null
  expires_at: string | null
  created_at: string
}
export interface AtRiskUser {
  user_id: string
  email: string | null
  reason: string
  expires_at: string | null
}
export interface SubscriptionsSummary {
  events: SubscriptionEvent[]
  refunds: SubscriptionEvent[]
  atRisk: AtRiskUser[]
  comped: CompedUser[]
  configured: boolean
  note?: string
}

// --- USER NOTES / FLAGS ---------------------------------------
export interface UserNote {
  id: string
  user_id: string
  author_id: string | null
  body: string
  created_at: string
}
export interface UserFlag {
  id: string
  user_id: string
  flag: string
  reason: string | null
  active: boolean
  created_by: string | null
  created_at: string
}

// --- AI SAFETY / ADVERSE / FEEDBACK ---------------------------
export interface AdverseEvent {
  id: string
  user_id: string | null
  email?: string | null
  compound_id: string | null
  description: string
  severity: string
  status: string
  created_at: string
}
export interface FeedbackItem {
  id: string
  user_id: string | null
  email?: string | null
  body: string
  rating: number | null
  app_version: string | null
  created_at: string
}
export interface SafetySummary {
  enabled: boolean
  flagged: AiQuery[]
  dosingHotspots: { compound: string; count: number }[]
  offLibraryMentions: { compound: string; count: number }[]
  adverse: AdverseEvent[]
  feedback: FeedbackItem[]
  note?: string
}

// --- AI COST --------------------------------------------------
export interface CostSummary {
  enabled: boolean
  today: number
  month: number
  byDay: { date: string; cost: number }[]
  byModel: { model: string; cost: number; count: number }[]
  byUser: { user_id: string; email: string | null; cost: number }[]
  cacheHitRate: number | null
  projected30d: number | null
  note?: string
}

// --- GROWTH ---------------------------------------------------
export interface ReferralCode {
  code: string
  owner_label: string | null
  uses: number
  conversions: number
  active: boolean
  created_at: string
}
export interface DiscountCode {
  code: string
  percent_off: number | null
  expires_at: string | null
  max_redemptions: number | null
  redemptions: number
  active: boolean
  created_at: string
}
export interface SavedSegment {
  id: string
  name: string
  definition: Record<string, unknown>
  created_at: string
}
export interface CannedResponse {
  id: string
  title: string
  body: string
  created_at: string
}

// --- COMPOUND VERSIONS (CMS history) --------------------------
export interface CompoundVersion {
  id: string
  compound_id: string
  data: Compound
  edited_by: string | null
  note: string | null
  created_at: string
}

// --- generic edge-function envelope ---------------------------

export interface ApiError {
  error: string
  status?: number
}
