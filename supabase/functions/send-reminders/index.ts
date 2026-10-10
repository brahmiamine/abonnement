// Edge Function Supabase (Deno) : envoie les rappels de renouvellement en notification push.
// Appelée toutes les heures par pg_cron (voir docs/PUSH.md) avec l'en-tête x-cron-secret.
//
// Secrets requis : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), CRON_SECRET.
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2.76.1'
import webpush from 'npm:web-push@3.6.7'
import { dueReminders, reminderKey, type SubscriptionRow } from './reminders.ts'

type PushRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  timezone: string
}

const APP_URL = Deno.env.get('APP_URL') ?? 'https://brahmiamine.github.io/abonnement/'

const required = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Secret manquant : ${name}`)
  return value
}

/** Comparaison en temps constant pour ne pas révéler le secret par le temps de réponse. */
const sameSecret = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    if (!sameSecret(request.headers.get('x-cron-secret') ?? '', required('CRON_SECRET'))) {
      return new Response('Unauthorized', { status: 401 })
    }

    webpush.setVapidDetails(
      required('VAPID_SUBJECT'),
      required('VAPID_PUBLIC_KEY'),
      required('VAPID_PRIVATE_KEY'),
    )

    const db = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    })
    const now = new Date()

    const { data: devices, error: devicesError } = await db
      .from('push_subscriptions')
      .select('id,user_id,endpoint,p256dh,auth,timezone')
    if (devicesError) throw devicesError

    const userIds = [...new Set((devices as PushRow[]).map((device) => device.user_id))]
    if (!userIds.length) return Response.json({ devices: 0, sent: 0, removed: 0 })

    const [{ data: settings }, { data: subscriptions, error: subsError }] = await Promise.all([
      db.from('subscription_settings').select('user_id,reminders_enabled').in('user_id', userIds),
      db
        .from('subscriptions')
        .select('id,user_id,name,price,cycle,status,auto_renew,renewal_date,remind_days')
        .in('user_id', userIds),
    ])
    if (subsError) throw subsError

    const enabled = new Set(
      (settings ?? [])
        .filter((row: { reminders_enabled: boolean }) => row.reminders_enabled)
        .map((row: { user_id: string }) => row.user_id),
    )

    const byUser = new Map<string, SubscriptionRow[]>()
    for (const item of (subscriptions ?? []) as SubscriptionRow[]) {
      byUser.set(item.user_id, [...(byUser.get(item.user_id) ?? []), item])
    }

    const { data: logRows } = await db
      .from('push_reminder_log')
      .select('push_subscription_id,subscription_id,renewal_date,days_before')
      .in('push_subscription_id', (devices as PushRow[]).map((device) => device.id))

    const logged = new Map<string, Set<string>>()
    for (const row of logRows ?? []) {
      const set = logged.get(row.push_subscription_id) ?? new Set<string>()
      set.add(reminderKey(row.subscription_id, row.renewal_date, row.days_before))
      logged.set(row.push_subscription_id, set)
    }

    let sent = 0
    const gone: string[] = []

    for (const device of devices as PushRow[]) {
      if (!enabled.has(device.user_id)) continue

      const reminders = dueReminders(
        byUser.get(device.user_id) ?? [],
        now,
        device.timezone,
        logged.get(device.id),
      )

      for (const reminder of reminders) {
        try {
          await webpush.sendNotification(
            { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
            JSON.stringify({
              title: reminder.title,
              body: reminder.body,
              tag: reminderKey(reminder.subscriptionId, reminder.renewalDate, reminder.daysBefore),
              url: APP_URL,
            }),
            { TTL: 60 * 60 * 12, urgency: 'normal' },
          )
          sent += 1
          await db.from('push_reminder_log').insert({
            push_subscription_id: device.id,
            subscription_id: reminder.subscriptionId,
            renewal_date: reminder.renewalDate,
            days_before: reminder.daysBefore,
          })
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode
          // 404/410 : l'appareil s'est désabonné, on oublie son abonnement.
          if (status === 404 || status === 410) {
            gone.push(device.id)
            break
          }
          console.error('Envoi push échoué', device.id, status ?? error)
        }
      }
    }

    if (gone.length) await db.from('push_subscriptions').delete().in('id', gone)

    // Le journal ne sert qu'à éviter les doublons du jour : on purge ce qui a plus de 60 jours.
    await db
      .from('push_reminder_log')
      .delete()
      .lt('sent_at', new Date(now.getTime() - 60 * 86_400_000).toISOString())

    return Response.json({ devices: devices.length, sent, removed: gone.length })
  } catch (error) {
    console.error('send-reminders', error)
    return new Response('Internal error', { status: 500 })
  }
})
