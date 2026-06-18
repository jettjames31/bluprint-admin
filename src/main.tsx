import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/auth'
import { LarpProvider } from '@/lib/larp'
import { ToastProvider } from '@/components/ui'
import { App } from './App'
import './theme/global.css'

// HashRouter (not BrowserRouter): in the bundled Tauri app the frontend is
// served from a file:// / custom-protocol origin with no routing server, so
// hash-based routes avoid deep-link 404s. Supabase PKCE returns ?code= in the
// query string, which stays readable alongside the hash route.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <LarpProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </LarpProvider>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
