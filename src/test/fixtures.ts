import type { Provider, Subscription } from '../types'

export const subscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'sub-1',
  providerId: 'netflix',
  name: 'Netflix',
  logo: '',
  category: 'Streaming',
  price: 15,
  currency: 'EUR',
  cycle: 'monthly',
  startDate: '2026-01-01',
  renewalDate: '2099-01-01',
  status: 'active',
  autoRenew: true,
  remindDays: [7, 3, 1],
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

export const provider = (overrides: Partial<Provider> = {}): Provider => ({
  id: 'netflix',
  name: 'Netflix',
  category: 'Streaming',
  logo: '',
  website: 'https://netflix.com',
  color: '#111827',
  ...overrides,
})
