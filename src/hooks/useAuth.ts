import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setAuthReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setAuthReady(true)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') setPasswordRecovery(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return {
    session,
    authReady,
    passwordRecovery,
    completePasswordRecovery: () => setPasswordRecovery(false),
    signOut: () => supabase.auth.signOut(),
  }
}
