import type { BillingCycle, Subscription } from '../types'

const DAY = 86_400_000

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

const toIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const toMonthly = (price: number, cycle: BillingCycle) => {
  if (cycle === 'weekly') return (price * 52) / 12
  if (cycle === 'quarterly') return price / 3
  if (cycle === 'yearly') return price / 12
  return price
}

export const toAnnual = (price: number, cycle: BillingCycle) => toMonthly(price, cycle) * 12

export const daysUntil = (date: string, now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(parseDate(date).getFullYear(), parseDate(date).getMonth(), parseDate(date).getDate()).getTime()
  return Math.ceil((target - today) / DAY)
}

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(parseDate(date))

export const cycleLabel = (cycle: BillingCycle) =>
  ({ weekly: 'semaine', monthly: 'mois', quarterly: 'trimestre', yearly: 'an' })[cycle]

export const nextRenewalLabel = (date: string, now = new Date()) => {
  const days = daysUntil(date, now)
  if (days < 0) return `Expiré depuis ${Math.abs(days)} j`
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  return `Dans ${days} jours`
}

export const subscriptionMonthlyTotal = (items: Subscription[]) =>
  items
    .filter((item) => item.status !== 'paused')
    .reduce((sum, item) => sum + toMonthly(item.price, item.cycle), 0)

const addCalendarMonths = (date: Date, months: number) => {
  const day = date.getDate()
  date.setDate(1)
  date.setMonth(date.getMonth() + months)
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDay))
}

export const advanceRenewalDate = (date: string, cycle: BillingCycle) => {
  const value = parseDate(date)
  if (cycle === 'weekly') value.setDate(value.getDate() + 7)
  if (cycle === 'monthly') addCalendarMonths(value, 1)
  if (cycle === 'quarterly') addCalendarMonths(value, 3)
  if (cycle === 'yearly') addCalendarMonths(value, 12)
  return toIsoDate(value)
}

export const rollAutoRenewalForward = (item: Subscription, now = new Date()) => {
  if (!item.autoRenew || item.status === 'paused') return item

  let renewalDate = item.renewalDate
  let guard = 0
  while (daysUntil(renewalDate, now) < 0 && guard < 120) {
    renewalDate = advanceRenewalDate(renewalDate, item.cycle)
    guard += 1
  }

  return renewalDate === item.renewalDate ? item : { ...item, renewalDate }
}
