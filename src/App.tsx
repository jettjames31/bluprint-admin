import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Loading } from '@/components/ui'
import { Layout } from '@/components/Layout'
import { Login } from '@/pages/Login'
import { Overview } from '@/pages/Overview'
import { Users } from '@/pages/Users'
import { Subscriptions } from '@/pages/Subscriptions'
import { Revenue } from '@/pages/Revenue'
import { Analytics } from '@/pages/Analytics'
import { AiMonitoring } from '@/pages/AiMonitoring'
import { Cost } from '@/pages/Cost'
import { Safety } from '@/pages/Safety'
import { AppHealth } from '@/pages/AppHealth'
import { Leads } from '@/pages/Leads'
import { Announcements } from '@/pages/Announcements'
import { Push } from '@/pages/Push'
import { Growth } from '@/pages/Growth'
import { Compounds } from '@/pages/Compounds'
import { Tickets } from '@/pages/Tickets'
import { Audit } from '@/pages/Audit'
import { Settings } from '@/pages/Settings'
import { Updates } from '@/pages/Updates'
import { Portfolio } from '@/pages/Portfolio'
import { Advisor } from '@/pages/Advisor'
import { Marketing } from '@/pages/Marketing'

// Dev-only design-preview bypass: lets you browse the full UI without a backend
// or sign-in (`VITE_PREVIEW=1 npm run dev`). Gated on import.meta.env.DEV, which
// is FALSE in every production build (vite build / the Tauri bundle), so this can
// never bypass auth in a shipped app — it's dead code there. Data calls still
// fail (no session), so pages show their loading/error states; this is purely to
// preview layout + styling. See MORNING-TODO / README.
const PREVIEW = import.meta.env.DEV && import.meta.env.VITE_PREVIEW === '1'

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
  if (!PREVIEW && (!session || isAdmin !== true)) {
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
        <Route index element={<Overview />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="users" element={<Users />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="ai" element={<AiMonitoring />} />
        <Route path="cost" element={<Cost />} />
        <Route path="safety" element={<Safety />} />
        <Route path="advisor" element={<Advisor />} />
        <Route path="health" element={<AppHealth />} />
        <Route path="leads" element={<Leads />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="push" element={<Push />} />
        <Route path="growth" element={<Growth />} />
        <Route path="marketing" element={<Marketing />} />
        <Route path="compounds" element={<Compounds />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="audit" element={<Audit />} />
        <Route path="settings" element={<Settings />} />
        <Route path="updates" element={<Updates />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
