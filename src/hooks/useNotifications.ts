import { useEffect } from 'react'
import { NOTIFIED_KEY, isoToday } from '../config'
import { daysUntil, formatDate, formatMoney } from '../domain/subscriptions'
import type { Subscription } from '../types'

export function useNotifications(subscriptions: Subscription[], enabled: boolean) {
  useEffect(() => {
    const check = async () => {
      if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') return

      const sent: Record<string, string> = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}')
      const today = isoToday()

      for (const item of subscriptions) {
        if (item.status === 'paused') continue

        const days = daysUntil(item.renewalDate)
        if (!item.remindDays.includes(days)) continue

        const key = `${item.id}:${item.renewalDate}:${days}`
        if (sent[key] === today) continue

        const title =
          days === 0
            ? `${item.name} se renouvelle aujourd’hui`
            : `${item.name} : renouvellement dans ${days} j`
        const body = `${formatMoney(item.price)} · ${formatDate(item.renewalDate)}`

        try {
          const registration = await navigator.serviceWorker?.ready
          if (registration) {
            await registration.showNotification(title, {
              body,
              icon: `${import.meta.env.BASE_URL}icon.svg`,
              badge: `${import.meta.env.BASE_URL}icon.svg`,
              tag: key,
            })
          } else {
            new Notification(title, { body, icon: `${import.meta.env.BASE_URL}icon.svg`, tag: key })
          }
          sent[key] = today
        } catch {
          // Browser notification capabilities differ; reminders must never block the app.
        }
      }

      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(sent))
    }

    void check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }

    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [subscriptions, enabled])
}
