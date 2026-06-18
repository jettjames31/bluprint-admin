// App shell: left sidebar nav + main content outlet.
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useActiveApp } from '@/lib/activeApp'
import { Icon, type IconName } from './Icon'
import logo from '@/assets/logo.png'

interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

// App switcher — picks which app's backend every page talks to. "Portfolio"
// jumps to the all-apps view. With one app it still shows the structure.
function AppSwitcher() {
  const { app, apps, setApp } = useActiveApp()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const mono = (short: string, color: string, size = 24) => (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 7,
        background: color,
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontSize: size <= 20 ? 11 : 12,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {short}
    </span>
  )
  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="row gap-8"
        style={{
          width: '100%',
          alignItems: 'center',
          padding: '8px 10px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          cursor: 'pointer',
        }}
      >
        {mono(app.short, app.color)}
        <span style={{ flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {app.name}
        </span>
        <span className="faint" style={{ fontSize: 11 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            zIndex: 40,
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {apps.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setApp(a.id)
                setOpen(false)
              }}
              className="row gap-8"
              style={{
                width: '100%',
                alignItems: 'center',
                padding: '7px 8px',
                borderRadius: 8,
                background: a.id === app.id ? 'var(--surface-2)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {mono(a.short, a.color, 20)}
              <span style={{ flex: 1, textAlign: 'left', fontSize: 12.5 }}>{a.name}</span>
              {!a.live && <span className="faint" style={{ fontSize: 11 }}>soon</span>}
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '6px 4px' }} />
          <button
            type="button"
            onClick={() => {
              nav('/portfolio')
              setOpen(false)
            }}
            className="row gap-8"
            style={{ width: '100%', alignItems: 'center', padding: '7px 8px', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}
          >
            <Icon name="grid" width={18} height={18} />
            <span style={{ fontSize: 12.5 }}>Portfolio (all apps)</span>
          </button>
        </div>
      )}
    </div>
  )
}

// Grouped so the V1 (read-only over existing data) features read first, then
// the V2 action features. SVG icons (Icon.tsx) for consistent monochrome theming.
const GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Home',
    items: [
      { to: '/', label: 'Overview', icon: 'home', end: true },
      { to: '/portfolio', label: 'Portfolio', icon: 'grid' },
    ],
  },
  {
    heading: 'People',
    items: [
      { to: '/users', label: 'Users', icon: 'users' },
      { to: '/subscriptions', label: 'Subscriptions', icon: 'subscriptions' },
      { to: '/leads', label: 'Leads', icon: 'leads' },
    ],
  },
  {
    heading: 'Insights',
    items: [
      { to: '/analytics', label: 'Analytics', icon: 'analytics' },
      { to: '/revenue', label: 'Revenue', icon: 'revenue' },
      { to: '/ai', label: 'AI Monitoring', icon: 'ai' },
      { to: '/cost', label: 'AI Cost', icon: 'cost' },
      { to: '/safety', label: 'AI Safety', icon: 'safety' },
      { to: '/advisor', label: 'AI Advisor', icon: 'advisor' },
    ],
  },
  {
    heading: 'Engage',
    items: [
      { to: '/announcements', label: 'Announcements', icon: 'announce' },
      { to: '/push', label: 'Push', icon: 'push' },
      { to: '/growth', label: 'Growth', icon: 'growth' },
      { to: '/marketing', label: 'AI Marketing', icon: 'target' },
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
    heading: 'System',
    items: [
      { to: '/health', label: 'App Health', icon: 'health' },
      { to: '/audit', label: 'Audit Log', icon: 'audit' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
      { to: '/updates', label: 'Updates', icon: 'update' },
    ],
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

        <AppSwitcher />

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
