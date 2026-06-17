// Minimal inline SVG icon set (Lucide-style: 24px grid, 1.8 stroke, round caps,
// currentColor) — replaces emoji so icons theme cleanly + render consistently.
import type { SVGProps } from 'react'

export type IconName =
  | 'users'
  | 'revenue'
  | 'ai'
  | 'health'
  | 'leads'
  | 'announce'
  | 'push'
  | 'compounds'
  | 'support'
  | 'settings'
  | 'home'
  | 'subscriptions'
  | 'analytics'
  | 'cost'
  | 'safety'
  | 'growth'
  | 'audit'

const PATHS: Record<IconName, JSX.Element> = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  revenue: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </>
  ),
  ai: (
    <>
      <path d="M12 2.5l1.7 5.8L19.5 10l-5.8 1.7L12 17.5l-1.7-5.8L4.5 10l5.8-1.7z" />
      <path d="M18.5 16l.8 2.2L21.5 19l-2.2.8L18.5 22l-.8-2.2L15.5 19l2.2-.8z" />
    </>
  ),
  health: <path d="M22 12h-4l-3 8L9 4l-3 8H2" />,
  leads: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  announce: (
    <>
      <path d="M3 11l14-6v14L3 13z" />
      <path d="M3 11H2.5a0 0 0 0 0 0 0v2a0 0 0 0 0 0 0H3" />
      <path d="M8 14v3a2 2 0 0 0 4 0v-1.5" />
    </>
  ),
  push: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  compounds: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6L5 18a1.5 1.5 0 0 0 1.3 2.3h11.4A1.5 1.5 0 0 0 19 18l-5-9V3" />
      <path d="M7 15h10" />
    </>
  ),
  support: (
    <>
      <path d="M4 6h16a1 1 0 0 1 1 1v3a2 2 0 0 0 0 4v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a2 2 0 0 0 0-4V7a1 1 0 0 1 1-1z" />
      <path d="M13 6v12" />
    </>
  ),
  settings: (
    <>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </>
  ),
  subscriptions: (
    <>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </>
  ),
  analytics: <path d="M7 20V10M12 20V4M17 20v-6" />,
  cost: (
    <>
      <path d="M12 1v22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  safety: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </>
  ),
  growth: (
    <>
      <path d="M22 7 13.5 15.5l-4-4L2 19" />
      <path d="M16 7h6v6" />
    </>
  ),
  audit: (
    <>
      <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="M9 7h6M9 12h6M9 17h4" />
    </>
  ),
}

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  )
}
