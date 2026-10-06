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
