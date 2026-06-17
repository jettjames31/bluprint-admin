/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_FUNCTIONS_URL?: string
  readonly VITE_PREVIEW?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Build identity injected by vite.config.ts `define`.
declare const __BUILD_ID__: string
declare const __BUILT_AT__: string
declare const __APP_VERSION__: string
