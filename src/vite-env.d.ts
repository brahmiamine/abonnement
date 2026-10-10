/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Clé publique VAPID : sans elle, seules les notifications locales (application ouverte) sont proposées. */
  readonly VITE_VAPID_PUBLIC_KEY?: string
}
