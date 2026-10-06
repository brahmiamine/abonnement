import type { Category, Subscription } from '../types'
import { toAnnual, toMonthly } from './subscriptions'

export const expenseSummary = (items: Subscription[]) => {
  const active = items.filter((item) => item.status !== 'paused')
  const monthly = active.reduce((sum, item) => sum + toMonthly(item.price, item.cycle), 0)
  const annual = active.reduce((sum, item) => sum + toAnnual(item.price, item.cycle), 0)
  const mostExpensive = active.reduce<Subscription | undefined>((current, item) => {
    if (!current) return item
    return toMonthly(item.price, item.cycle) > toMonthly(current.price, current.cycle) ? item : current
  }, undefined)

  return {
    monthly,
    annual,
    activeCount: active.length,
    averageMonthly: active.length ? monthly / active.length : 0,
    mostExpensive,
  }
}

export const expensesByCategory = (items: Subscription[]): [Category, number][] => {
  const totals = new Map<Category, number>()

  for (const item of items) {
    if (item.status === 'paused') continue
    totals.set(item.category, (totals.get(item.category) || 0) + toMonthly(item.price, item.cycle))
  }

  return [...totals.entries()].sort((a, b) => b[1] - a[1])
}
