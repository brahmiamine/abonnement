import { describe, expect, it } from 'vitest'
import type { Subscription } from '../types'
import { expenseSummary, expensesByCategory } from './expenses'

const item = (overrides: Partial<Subscription>): Subscription => ({
  id: 'id',
  name: 'Service',
  logo: '',
  category: 'IA',
  price: 12,
  currency: 'EUR',
  cycle: 'monthly',
  startDate: '2026-01-01',
  renewalDate: '2026-02-01',
  status: 'active',
  autoRenew: true,
  remindDays: [7],
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('expenseSummary', () => {
  it('counts only non-paused subscriptions and normalizes billing cycles', () => {
    const result = expenseSummary([
      item({ id: 'monthly', price: 12, cycle: 'monthly' }),
      item({ id: 'yearly', price: 120, cycle: 'yearly' }),
      item({ id: 'paused', price: 999, status: 'paused' }),
    ])

    expect(result.monthly).toBe(22)
    expect(result.annual).toBe(264)
    expect(result.activeCount).toBe(2)
    expect(result.averageMonthly).toBe(11)
    expect(result.mostExpensive?.id).toBe('monthly')
  })
})

describe('expensesByCategory', () => {
  it('returns monthly expenses sorted from highest to lowest', () => {
    const result = expensesByCategory([
      item({ id: 'ai', category: 'IA', price: 20 }),
      item({ id: 'music', category: 'Musique', price: 120, cycle: 'yearly' }),
      item({ id: 'paused', category: 'Streaming', price: 100, status: 'paused' }),
    ])

    expect(result).toEqual([
      ['IA', 20],
      ['Musique', 10],
    ])
  })
})
