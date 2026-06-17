// App shell: left sidebar nav + main content outlet.
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Icon, type IconName } from './Icon'
import logo from '@/assets/logo.png'

interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

// Grouped so the V1 (read-only over existing data) features read first, then
// the V2 action features. SVG icons (Icon.tsx) for consistent monochrome theming.
const GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { to: '/', label: 'Users', icon: 'users', end: true },
      { to: '/revenue', label: 'Revenue', icon: 'revenue' },
      { to: '/ai', label: 'AI Monitoring', icon: 'ai' },
      { to: '/health', label: 'App Health', icon: 'health' },
    ],
  },
  {
    heading: 'Growth',
    items: [
      { to: '/leads', label: 'Leads', icon: 'leads' },
      { to: '/announcements', label: 'Announcements', icon: 'announce' },
      { to: '/push', label: 'Push', icon: 'push' },
    ],
  },
  {
    heading: 'Content & Support',
    items: [
      { to: '/compounds', label: 'Compounds', icon: 'compounds' },
      { to: '/tickets', label: 'Support', icon: 'support' },
    ],
  },
  {
    heading: 'Config',
    items: [{ to: '/settings', label: 'Settings', icon: 'settings' }],
  },
]

export function Layout() {
  const { email, role, signOut } = useAuth()
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <aside
        style={{
          width: 'var(--sidebar-w)',
          flexShrink: 0,
          background: 'var(--bg-elev)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 12px',
        }}
      >
        <div className="row gap-8" style={{ padding: '4px 8px 20px' }}>
          <img src={logo} alt="Bluprint" width={28} height={28} style={{ display: 'block', objectFit: 'contain' }} />
          <strong style={{ fontSize: 15, letterSpacing: '-0.02em' }}>Bluprint</strong>
          <span
            className="faint"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', marginTop: 1 }}
          >
            ADMIN
          </span>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {GROUPS.map((g) => (
            <div key={g.heading} style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                  padding: '4px 8px',
                }}
              >
                {g.heading}
              </div>
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className="navlink">
                  <Icon name={it.icon} />
                  <span>{it.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
          <div style={{ padding: '0 8px 8px', fontSize: 12 }}>
            <div className="nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {email || '—'}
            </div>
            <div className="faint" style={{ fontSize: 11 }}>
              {role || 'founder'}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}

// Page header used by every page for a consistent title + actions row.
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="row between" style={{ marginBottom: 20, alignItems: 'flex-start' }}>
      <div>
        <h1 style={{ fontSize: 22 }}>{title}</h1>
        {subtitle && (
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            {subtitle}
          </div>
        )}
      </div>
      {actions && <div className="row gap-8 wrap">{actions}</div>}
    </div>
  )
}

export function Page({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>{children}</div>
}
