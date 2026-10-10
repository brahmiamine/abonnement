import { beforeEach, describe, expect, it, vi } from 'vitest'
import { subscription } from '../test/fixtures'
import {
  appendOp,
  clearOfflineData,
  isNetworkError,
  readQueue,
  readSnapshot,
  writeQueue,
  writeSnapshot,
  type PendingOp,
} from './offline'

const calls: string[] = []
let failWith: unknown = null

vi.mock('./subscriptionsDb', () => ({
  upsertSubscription: vi.fn(async (item: { id: string }) => {
    if (failWith) throw failWith
    calls.push(`upsert:${item.id}`)
  }),
  removeSubscription: vi.fn(async (id: string) => {
    calls.push(`remove:${id}`)
  }),
  removeAllSubscriptions: vi.fn(async () => {
    calls.push('clear')
  }),
  saveUserSettings: vi.fn(async () => {
    calls.push('settings')
  }),
}))
vi.mock('./providersDb', () => ({
  saveProvider: vi.fn(async () => {
    calls.push('provider')
  }),
  deleteProvider: vi.fn(async (id: string) => {
    calls.push(`deleteProvider:${id}`)
  }),
}))

const { flushQueue } = await import('./syncQueue')

beforeEach(() => {
  calls.length = 0
  failWith = null
})

describe('copie locale et file d’attente', () => {
  it('relit ce qui a été écrit, par utilisateur', () => {
    const data = {
      subscriptions: [subscription()],
      providers: [],
      categories: [],
      settings: { theme: 'dark' as const, remindersEnabled: false },
    }
    writeSnapshot('u1', data)
    expect(readSnapshot('u1')?.subscriptions).toHaveLength(1)
    expect(readSnapshot('u2')).toBeNull()

    writeQueue('u1', [{ type: 'removeSubscription', id: 'a' }])
    expect(readQueue('u1')).toHaveLength(1)

    clearOfflineData('u1')
    expect(readSnapshot('u1')).toBeNull()
    expect(readQueue('u1')).toEqual([])
  })

  it('ignore un contenu corrompu', () => {
    localStorage.setItem('subly-snapshot-v1:u1', '{pas du json')
    localStorage.setItem('subly-queue-v1:u1', '"oops"')
    expect(readSnapshot('u1')).toBeNull()
    expect(readQueue('u1')).toEqual([])
  })

  it('ne garde que le dernier état des réglages dans la file', () => {
    const settings = (theme: 'dark' | 'light'): PendingOp => ({
      type: 'saveSettings',
      settings: { theme, remindersEnabled: false },
    })
    const queue = [
      settings('dark'),
      { type: 'removeSubscription', id: 'a' } as PendingOp,
      settings('light'),
    ].reduce(appendOp, [] as PendingOp[])

    expect(queue.map((op) => op.type)).toEqual(['removeSubscription', 'saveSettings'])
    expect((queue[1] as { settings: { theme: string } }).settings.theme).toBe('light')
  })
})

describe('isNetworkError', () => {
  it('reconnaît les pannes de connexion', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isNetworkError({ message: 'TypeError: Load failed' })).toBe(true)
  })

  it('ne confond pas un refus du serveur avec une panne', () => {
    expect(isNetworkError({ message: 'new row violates row-level security policy' })).toBe(false)
  })
})

describe('flushQueue', () => {
  const queue: PendingOp[] = [
    { type: 'upsertSubscription', item: subscription({ id: 'a' }) },
    { type: 'removeSubscription', id: 'b' },
    { type: 'saveSettings', settings: { theme: 'dark', remindersEnabled: false } },
  ]

  it('rejoue tout dans l’ordre', async () => {
    const result = await flushQueue(queue, 'u1')
    expect(calls).toEqual(['upsert:a', 'remove:b', 'settings'])
    expect(result).toEqual({ remaining: [], failed: 0 })
  })

  it('s’arrête à la première panne réseau et garde le reste', async () => {
    failWith = new TypeError('Failed to fetch')
    const result = await flushQueue(queue, 'u1')
    expect(result.remaining).toHaveLength(3)
    expect(calls).toEqual([])
  })

  it('abandonne une écriture refusée sans bloquer les suivantes', async () => {
    failWith = { message: 'permission denied' }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await flushQueue(queue, 'u1')
    expect(result.failed).toBe(1)
    expect(result.remaining).toEqual([])
    expect(calls).toEqual(['remove:b', 'settings'])
  })
})
