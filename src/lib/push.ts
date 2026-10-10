import { supabase } from './supabase'

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

/** Le navigateur sait recevoir des notifications push et la clé VAPID est configurée. */
export const isPushAvailable = () =>
  Boolean(VAPID_PUBLIC_KEY) &&
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  typeof window !== 'undefined' &&
  'PushManager' in window &&
  'Notification' in window

/** Convertit la clé VAPID (base64url) au format attendu par `pushManager.subscribe`. */
export function urlBase64ToUint8Array(value: string) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4)
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

const currentSubscription = async () => {
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

/** Cet appareil est-il déjà abonné aux notifications push ? */
export async function hasPushSubscription() {
  if (!isPushAvailable()) return false
  try {
    return Boolean(await currentSubscription())
  } catch {
    return false
  }
}

/** Abonne l'appareil (permission déjà accordée) et enregistre son abonnement côté serveur. */
export async function enablePush(userId: string) {
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }))

  const { endpoint, keys } = subscription.toJSON() as {
    endpoint: string
    keys?: { p256dh?: string; auth?: string }
  }
  if (!keys?.p256dh || !keys.auth) throw new Error('Abonnement push incomplet')

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}

/** Désabonne l'appareil et oublie son abonnement côté serveur. */
export async function disablePush() {
  const subscription = await currentSubscription()
  if (!subscription) return
  const { endpoint } = subscription
  await subscription.unsubscribe()
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw error
}
