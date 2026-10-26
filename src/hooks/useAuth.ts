import { useEffect, useState } from 'react'
import { auth, takeRecoveryToken, type Session } from '../lib/api'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(() => auth.getSession())
  const [authReady, setAuthReady] = useState(false)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  useEffect(() => {
    let active = true
    const unsubscribe = auth.onChange((nextSession) => {
      setSession(nextSession)
      if (!nextSession) setPasswordRecovery(false)
    })

    const recoveryToken = takeRecoveryToken()
    const start = recoveryToken
      ? auth.verifyRecovery(recoveryToken).then(() => {
          if (active) setPasswordRecovery(true)
        })
      : auth.refresh()

    start
      .catch((error) => console.error('Subly auth check failed', error))
      .finally(() => {
        if (active) setAuthReady(true)
      })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return {
    session,
    authReady,
    passwordRecovery,
    completePasswordRecovery: () => setPasswordRecovery(false),
    signOut: () => auth.signOut(),
  }
}
