import { createClient } from '@supabase/supabase-js'

// Surchargeables via .env (voir .env.example) ; les valeurs par défaut ciblent le projet de production.
// La clé publiable est publique par conception : la sécurité repose sur la Row Level Security.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://ewswqwmaejddwqiwaspq.supabase.co'
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3c3dxd21hZWpkZHdxaXdhc3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTIwMDMsImV4cCI6MjA3ODE2ODAwM30.7KGg8oQSD70Wvoi6h82xGY6VEpnyDw91VDj_xknN0bU'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
