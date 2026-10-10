import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  upserts: [] as Array<{ row: Record<string, unknown>; options: unknown }>,
  deletes: [] as string[],
  upsertError: null as null | Error,
}))

vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      upsert: async (row: Record<string, unknown>, options: unknown) => {
        state.upserts.push({ row, options })
        return { error: state.upsertError }
      },
      delete: () => ({
        eq: async (_column: string, value: string) => {
          state.deletes.push(value)
          return { error: null }
        },
      }),
    }),
  },
}))

vi.stubEnv(
  'VITE_VAPID_PUBLIC_KEY',
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
)

const subscription = {
  endpoint: 'https://push.example/abc',
  toJSON: () => ({ endpoint: 'https://push.example/abc', keys: { p256dh: 'P', auth: 'A' } }),
  unsubscribe: vi.fn(async () => true),
}
const pushManager = {
  getSubscription: vi.fn(async () => null as unknown),
  subscribe: vi.fn(async () => subscription),
}

beforeEach(() => {
  state.upserts = []
  state.deletes = []
  state.upsertError = null
  subscription.unsubscribe.mockClear()
  pushManager.getSubscription.mockReset().mockResolvedValue(null)
  pushManager.subscribe.mockClear()

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ pushManager }) },
  })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', class {})
})

const load = async () => {
  vi.resetModules()
  return import('./push')
}

describe('urlBase64ToUint8Array', () => {
  it('décode une clé base64url', async () => {
    const { urlBase64ToUint8Array } = await load()
    const bytes = urlBase64ToUint8Array('SGVsbG8tXw') // « Hello-_ » en base64url
    expect([...bytes]).toEqual([72, 101, 108, 108, 111, 45, 95])
  })
})

describe('isPushAvailable', () => {
  it('exige la clé VAPID', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '')
    expect((await load()).isPushAvailable()).toBe(false)
    vi.stubEnv(
      'VITE_VAPID_PUBLIC_KEY',
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
    )
    expect((await load()).isPushAvailable()).toBe(true)
  })
})

describe('enablePush / disablePush', () => {
  it('abonne l’appareil et enregistre son abonnement avec son fuseau horaire', async () => {
    const { enablePush } = await load()
    await enablePush('user-1')

    expect(pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    )
    expect(state.upserts).toHaveLength(1)
    expect(state.upserts[0].row).toMatchObject({
      user_id: 'user-1',
      endpoint: 'https://push.example/abc',
      p256dh: 'P',
      auth: 'A',
      timezone: expect.any(String),
    })
    expect(state.upserts[0].options).toEqual({ onConflict: 'endpoint' })
  })

  it('réutilise l’abonnement existant du navigateur', async () => {
    pushManager.getSubscription.mockResolvedValue(subscription)
    const { enablePush } = await load()
    await enablePush('user-1')
    expect(pushManager.subscribe).not.toHaveBeenCalled()
    expect(state.upserts).toHaveLength(1)
  })

  it('remonte l’erreur si le serveur refuse', async () => {
    state.upsertError = new Error('RLS')
    const { enablePush } = await load()
    await expect(enablePush('user-1')).rejects.toThrow('RLS')
  })

  it('désabonne l’appareil et supprime son abonnement côté serveur', async () => {
    pushManager.getSubscription.mockResolvedValue(subscription)
    const { disablePush, hasPushSubscription } = await load()
    expect(await hasPushSubscription()).toBe(true)

    await disablePush()
    expect(subscription.unsubscribe).toHaveBeenCalled()
    expect(state.deletes).toEqual(['https://push.example/abc'])
  })

  it('ne fait rien s’il n’y a pas d’abonnement', async () => {
    const { disablePush } = await load()
    await disablePush()
    expect(state.deletes).toEqual([])
  })
})
