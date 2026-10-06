import type { BillingCycle, Subscription } from '../types'

const DAY = 86_400_000

export const toMonthly = (price: number, cycle: BillingCycle) => {
  if (cycle === 'weekly') return (price * 52) / 12
  if (cycle === 'quarterly') return price / 3
  if (cycle === 'yearly') return price / 12
  return price
}

export const toAnnual = (price: number, cycle: BillingCycle) => toMonthly(price, cycle) * 12

export const daysUntil = (date: string) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(`${date}T00:00:00`).getTime()
  return Math.ceil((target - today) / DAY)
}

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${date}T00:00:00`),
  )

export const cycleLabel = (cycle: BillingCycle) =>
  ({ weekly: 'semaine', monthly: 'mois', quarterly: 'trimestre', yearly: 'an' })[cycle]

export const nextRenewalLabel = (date: string) => {
  const days = daysUntil(date)
  if (days < 0) return `Expiré depuis ${Math.abs(days)} j`
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  return `Dans ${days} jours`
}

export const subscriptionMonthlyTotal = (items: Subscription[]) =>
  items
    .filter((item) => item.status !== 'paused')
    .reduce((sum, item) => sum + toMonthly(item.price, item.cycle), 0)


export const advanceRenewalDate = (date: string, cycle: BillingCycle) => {
  const value = new Date(`${date}T12:00:00`)
  if (cycle === 'weekly') value.setDate(value.getDate() + 7)
  if (cycle === 'monthly') value.setMonth(value.getMonth() + 1)
  if (cycle === 'quarterly') value.setMonth(value.getMonth() + 3)
  if (cycle === 'yearly') value.setFullYear(value.getFullYear() + 1)
  return value.toISOString().slice(0, 10)
}

export const rollAutoRenewalForward = (item: Subscription) => {
  if (!item.autoRenew || item.status === 'paused') return item
  let renewalDate = item.renewalDate
  let guard = 0
  while (daysUntil(renewalDate) < 0 && guard < 120) {
    renewalDate = advanceRenewalDate(renewalDate, item.cycle)
    guard += 1
  }
  return renewalDate === item.renewalDate ? item : { ...item, renewalDate }
}
