import type { Category, Subscription } from '../types'

export const expenseSummary = (_items: Subscription[]) => ({
  monthly: 0,
  annual: 0,
  activeCount: 0,
  averageMonthly: 0,
  mostExpensive: undefined as Subscription | undefined,
})

export const expensesByCategory = (_items: Subscription[]): [Category, number][] => []
