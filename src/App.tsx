import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Loading } from '@/components/ui'
import { Layout } from '@/components/Layout'
import { Login } from '@/pages/Login'
import { Users } from '@/pages/Users'
import { Revenue } from '@/pages/Revenue'
import { AiMonitoring } from '@/pages/AiMonitoring'
import { AppHealth } from '@/pages/AppHealth'
import { Leads } from '@/pages/Leads'
import { Announcements } from '@/pages/Announcements'
import { Push } from '@/pages/Push'
import { Compounds } from '@/pages/Compounds'
import { Tickets } from '@/pages/Tickets'
import { Settings } from '@/pages/Settings'

export function App() {
  const { ready, session, isAdmin } = useAuth()

  if (!ready) {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
        <Loading label="Loading…" />
      </div>
    )
  }

  // Not signed in, or signed in but not (yet confirmed) a founder → Login.
  // The Login page renders the "access denied" state when isAdmin === false.
  if (!session || isAdmin !== true) {
    if (session && isAdmin === null) {
      return (
        <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
          <Loading label="Verifying access…" />
        </div>
      )
    }
    return <Login />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Users />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="ai" element={<AiMonitoring />} />
        <Route path="health" element={<AppHealth />} />
        <Route path="leads" element={<Leads />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="push" element={<Push />} />
        <Route path="compounds" element={<Compounds />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
