// Logique pure des rappels (sans dépendance Deno) : testée avec Vitest.
// Les fonctions de dates reprennent celles de src/domain/subscriptions.ts ;
// reminders.test.ts vérifie que les deux implémentations restent identiques.

export type Cycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type SubscriptionRow = {
  id: string
  user_id: string
  name: string
  price: number | string
  cycle: Cycle
  status: 'active' | 'trial' | 'paused'
  auto_renew: boolean
  renewal_date: string
  remind_days: number[] | null
}

export type Reminder = {
  subscriptionId: string
  renewalDate: string
  daysBefore: number
  title: string
  body: string
}

/** Heure à partir de laquelle les rappels du jour partent (heure locale de l'appareil). */
export const SEND_FROM_HOUR = 9

const DAY = 86_400_000

const parse = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const addMonths = (date: Date, months: number) => {
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
}

export const advance = (date: string, cycle: Cycle) => {
  const value = parse(date)
  if (cycle === 'weekly') value.setDate(value.getDate() + 7)
  if (cycle === 'monthly') addMonths(value, 1)
  if (cycle === 'quarterly') addMonths(value, 3)
  if (cycle === 'yearly') addMonths(value, 12)
  return toIso(value)
}

export const daysBetween = (from: string, to: string) =>
  Math.round((parse(to).getTime() - parse(from).getTime()) / DAY)

/** Date (AAAA-MM-JJ) et heure locales d'un instant dans un fuseau donné ; UTC si le fuseau est inconnu. */
export function localDateTime(now: Date, timeZone: string) {
  const format = (zone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)

  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = format(timeZone)
  } catch {
    parts = format('UTC')
  }
  const get = (type: string) => parts.find((part) => part.type === type)!.value
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) }
}

/** Prochaine échéance : un renouvellement automatique dépassé avance de période en période. */
export function nextRenewal(item: SubscriptionRow, today: string) {
  if (!item.auto_renew) return item.renewal_date
  let date = item.renewal_date
  for (let guard = 0; guard < 520 && date < today; guard += 1) date = advance(date, item.cycle)
  return date
}

const money = (value: number | string) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value))

/** Rappels à envoyer aujourd'hui pour un appareil (fuseau + heure locale), hors ceux déjà envoyés. */
export function dueReminders(
  subscriptions: SubscriptionRow[],
  now: Date,
  timeZone: string,
  alreadySent: Set<string> = new Set(),
): Reminder[] {
  const { date: today, hour } = localDateTime(now, timeZone)
  if (hour < SEND_FROM_HOUR) return []

  const reminders: Reminder[] = []
  for (const item of subscriptions) {
    if (item.status === 'paused') continue

    const renewalDate = nextRenewal(item, today)
    const days = daysBetween(today, renewalDate)
    if (days < 0 || !(item.remind_days ?? []).includes(days)) continue
    if (alreadySent.has(reminderKey(item.id, renewalDate, days))) continue

    reminders.push({
      subscriptionId: item.id,
      renewalDate,
      daysBefore: days,
      title: days === 0 ? `${item.name} se renouvelle aujourd’hui` : `${item.name} : renouvellement dans ${days} j`,
      body: `${money(item.price)} · ${item.auto_renew ? 'renouvellement automatique' : 'fin de l’abonnement'}`,
    })
  }
  return reminders
}

export const reminderKey = (subscriptionId: string, renewalDate: string, days: number) =>
  `${subscriptionId}:${renewalDate}:${days}`
