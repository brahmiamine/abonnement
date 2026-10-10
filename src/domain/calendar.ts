import { shiftRenewalDate, toMonthly } from './subscriptions'
import type { Subscription } from '../types'

export type CalendarDay = {
  date: string
  day: number
  inMonth: boolean
  items: Subscription[]
  total: number
}

const pad = (value: number) => String(value).padStart(2, '0')
export const isoDate = (year: number, monthIndex: number, day: number) =>
  `${year}-${pad(monthIndex + 1)}-${pad(day)}`

/**
 * Dates de paiement d'un abonnement entre `from` et `to` (incluses, au format AAAA-MM-JJ).
 * Un abonnement à renouvellement automatique se répète depuis sa date de renouvellement
 * (passé compris, jusqu'à sa date de début) ; sans renouvellement, seule l'échéance compte.
 */
export function occurrencesBetween(item: Subscription, from: string, to: string): string[] {
  if (item.status === 'paused') return []

  if (!item.autoRenew) {
    return item.renewalDate >= from && item.renewalDate <= to ? [item.renewalDate] : []
  }

  const stepDays =
    item.cycle === 'weekly' ? 7 : { monthly: 30, quarterly: 91, yearly: 365 }[item.cycle]
  const spanDays = (a: string, b: string) => (Date.parse(a) - Date.parse(b)) / 86_400_000
  const first = Math.floor(spanDays(from, item.renewalDate) / stepDays) - 1
  const last = Math.ceil(spanDays(to, item.renewalDate) / stepDays) + 1

  const dates: string[] = []
  for (let step = first; step <= last; step += 1) {
    const date = shiftRenewalDate(item.renewalDate, item.cycle, step)
    if (date < from || date > to) continue
    if (item.startDate && date < item.startDate) continue
    if (item.expirationDate && date > item.expirationDate) continue
    dates.push(date)
  }
  return dates
}

/** Grille d'un mois (semaines du lundi au dimanche) avec les échéances de chaque jour. */
export function buildMonth(subscriptions: Subscription[], year: number, monthIndex: number) {
  const firstOfMonth = new Date(year, monthIndex, 1, 12)
  const offset = (firstOfMonth.getDay() + 6) % 7 // lundi = 0
  const gridStart = new Date(year, monthIndex, 1 - offset, 12)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const weekCount = Math.ceil((offset + daysInMonth) / 7)

  const days: CalendarDay[] = Array.from({ length: weekCount * 7 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
      12,
    )
    return {
      date: isoDate(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      inMonth: date.getMonth() === monthIndex,
      items: [],
      total: 0,
    }
  })

  const from = days[0].date
  const to = days[days.length - 1].date
  const byDate = new Map(days.map((day) => [day.date, day]))

  for (const item of subscriptions) {
    for (const date of occurrencesBetween(item, from, to)) {
      const day = byDate.get(date)
      if (!day) continue
      day.items.push(item)
      day.total += item.price
    }
  }

  const inMonth = days.filter((day) => day.inMonth)
  return {
    days,
    weeks: Array.from({ length: weekCount }, (_, week) => days.slice(week * 7, week * 7 + 7)),
    /** Total réellement prélevé ce mois-ci (selon les dates de paiement). */
    monthTotal: inMonth.reduce((sum, day) => sum + day.total, 0),
    paymentCount: inMonth.reduce((sum, day) => sum + day.items.length, 0),
    /** Équivalent mensuel lissé, pour comparer avec le total prélevé. */
    smoothedMonthly: subscriptions
      .filter((item) => item.status !== 'paused')
      .reduce((sum, item) => sum + toMonthly(item.price, item.cycle), 0),
  }
}
