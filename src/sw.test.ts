import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'

type Listener = (event: Record<string, unknown>) => void

/** Charge public/sw.js dans un faux contexte de service worker et renvoie ses écouteurs. */
function loadServiceWorker(scope = 'https://exemple.test/abonnement/') {
  const listeners: Record<string, Listener> = {}
  const showNotification = vi.fn(async () => {})
  const openWindow = vi.fn(async () => {})
  const clients: Array<{ url: string; focus: () => Promise<void> }> = []

  const self = {
    registration: { scope, showNotification },
    location: new URL(scope),
    addEventListener: (type: string, listener: Listener) => {
      listeners[type] = listener
    },
    skipWaiting: async () => {},
    clients: { matchAll: async () => clients, openWindow, claim: async () => {} },
  }

  new Function('self', 'caches', 'URL', 'Response', readFileSync('public/sw.js', 'utf8'))(
    self,
    {},
    URL,
    Response,
  )
  return { listeners, showNotification, openWindow, clients }
}

const pushEvent = (payload: unknown, raw?: string) => {
  const waits: Promise<unknown>[] = []
  return {
    event: {
      data: { json: () => payload, text: () => raw ?? '' },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    },
    done: () => Promise.all(waits),
  }
}

describe('service worker — push', () => {
  it('déduit son chemin de base de son scope', () => {
    const { listeners, showNotification } = loadServiceWorker('https://exemple.test/autre/')
    const { event, done } = pushEvent({ title: 'T' })
    listeners.push(event)
    return done().then(() =>
      expect(showNotification).toHaveBeenCalledWith(
        'T',
        expect.objectContaining({ icon: '/autre/icon-192.png', data: { url: '/autre/' } }),
      ),
    )
  })

  it('affiche la notification reçue du serveur', async () => {
    const { listeners, showNotification } = loadServiceWorker()
    const { event, done } = pushEvent({
      title: 'Netflix se renouvelle aujourd’hui',
      body: '15,99 €',
      tag: 's1:2026-03-10:0',
      url: 'https://exemple.test/abonnement/',
    })
    listeners.push(event)
    await done()

    expect(showNotification).toHaveBeenCalledWith(
      'Netflix se renouvelle aujourd’hui',
      expect.objectContaining({ body: '15,99 €', tag: 's1:2026-03-10:0' }),
    )
  })

  it('reste robuste face à un contenu qui n’est pas du JSON', async () => {
    const { listeners, showNotification } = loadServiceWorker()
    const waits: Promise<unknown>[] = []
    listeners.push({
      data: {
        json: () => {
          throw new SyntaxError('pas du JSON')
        },
        text: () => 'rappel brut',
      },
      waitUntil: (promise: Promise<unknown>) => waits.push(promise),
    })
    await Promise.all(waits)
    expect(showNotification).toHaveBeenCalledWith(
      'Subly',
      expect.objectContaining({ body: 'rappel brut' }),
    )
  })

  it('un clic met la fenêtre ouverte au premier plan, sinon en ouvre une', async () => {
    const { listeners, openWindow, clients } = loadServiceWorker()
    const close = vi.fn()
    const click = () => {
      const waits: Promise<unknown>[] = []
      listeners.notificationclick({
        notification: { close, data: { url: '/abonnement/' } },
        waitUntil: (promise: Promise<unknown>) => waits.push(promise),
      })
      return Promise.all(waits)
    }

    await click()
    expect(close).toHaveBeenCalled()
    expect(openWindow).toHaveBeenCalledWith('/abonnement/')

    const focus = vi.fn(async () => {})
    clients.push({ url: 'https://exemple.test/abonnement/', focus })
    await click()
    expect(focus).toHaveBeenCalled()
  })
})
