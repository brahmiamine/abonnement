import { describe, expect, it } from 'vitest'
import type { Subscription } from '../types'
import {
  advanceRenewalDate,
  daysUntil,
  rollAutoRenewalForward,
  toMonthly,
} from './subscriptions'

const subscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'sub',
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

describe('subscription domain', () => {
  it('normalizes billing cycles to a monthly cost', () => {
    expect(toMonthly(12, 'monthly')).toBe(12)
    expect(toMonthly(120, 'yearly')).toBe(10)
    expect(toMonthly(30, 'quarterly')).toBe(10)
  })

  it('keeps end-of-month calculations inside the target month', () => {
    expect(advanceRenewalDate('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(advanceRenewalDate('2024-01-31', 'monthly')).toBe('2024-02-29')
  })

  it('rolls an expired automatic renewal forward but leaves paused subscriptions unchanged', () => {
    const now = new Date(2026, 9, 6)
    const active = subscription({ renewalDate: '2026-08-31' })
    const paused = subscription({ renewalDate: '2026-08-31', status: 'paused' })

    expect(rollAutoRenewalForward(active, now).renewalDate).toBe('2026-10-30')
    expect(rollAutoRenewalForward(paused, now).renewalDate).toBe('2026-08-31')
    expect(daysUntil('2026-10-07', now)).toBe(1)
  })
})
