import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ewswqwmaejddwqiwaspq.supabase.co'
const supabasePublishableKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3c3dxd21hZWpkZHdxaXdhc3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1OTIwMDMsImV4cCI6MjA3ODE2ODAwM30.7KGg8oQSD70Wvoi6h82xGY6VEpnyDw91VDj_xknN0bU'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
