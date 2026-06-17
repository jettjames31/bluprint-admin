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
