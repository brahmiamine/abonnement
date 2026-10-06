import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { provider, subscription } from './test/fixtures'

const state = vi.hoisted(() => ({
  session: { user: { id: 'u1', email: 'moi@exemple.fr' } } as unknown,
  settings: null as null | { theme: 'dark' | 'light'; remindersEnabled: boolean },
  savedSettings: [] as Array<{ theme: string }>,
}))

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    session: state.session,
    authReady: true,
    passwordRecovery: false,
    completePasswordRecovery: () => {},
    signOut: vi.fn(),
  }),
}))

vi.mock('./lib/providersDb', () => ({
  ensureProviders: async () => [
    provider(),
    provider({ id: 'free-mobile', name: 'Free Mobile', category: 'Télécom' }),
  ],
  loadCategories: async () => ['Streaming', 'Télécom', 'Autre'],
  saveProvider: vi.fn(async () => {}),
  deleteProvider: vi.fn(async () => {}),
}))

vi.mock('./lib/subscriptionsDb', () => ({
  loadSubscriptions: async () => [subscription({ id: 'a', name: 'Netflix', renewalDate: '2099-01-01' })],
  loadUserSettings: async () => state.settings,
  saveUserSettings: vi.fn(async (settings: { theme: string }) => { state.savedSettings.push(settings) }),
  upsertSubscription: vi.fn(async () => {}),
  upsertSubscriptions: vi.fn(async () => {}),
  removeSubscription: vi.fn(async () => {}),
  removeAllSubscriptions: vi.fn(async () => {}),
}))

vi.mock('./lib/supabase', () => ({ supabase: {} }))

const { default: App } = await import('./App')

const ready = async () => {
  await screen.findByRole('heading', { level: 1, name: /Mes abonnements|Tous|Dépenses|Réglages|Fournisseurs/ })
}

beforeEach(() => {
  state.session = { user: { id: 'u1', email: 'moi@exemple.fr' } }
  state.settings = null
  state.savedSettings = []
})

describe('App — intégration', () => {
  it('affiche l’écran de connexion sans session', async () => {
    state.session = null
    vi.doMock('./components/auth/AuthScreen', () => ({ AuthScreen: () => <div>auth</div> }))
    render(<App />)
    expect(await screen.findByText('Connexion')).toBeInTheDocument()
  })

  it('ouvre l’accueil par défaut', async () => {
    render(<App />)
    await ready()
    expect(screen.getByRole('heading', { level: 1, name: 'Mes abonnements' })).toBeInTheDocument()
  })

  it('reste sur la page de l’URL après un « rafraîchissement »', async () => {
    window.location.hash = '#/settings'
    render(<App />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Réglages' })).toBeInTheDocument()
  })

  it('met à jour l’URL à chaque navigation', async () => {
    render(<App />)
    await ready()
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigation mobile' })).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /Dépenses/ })[0])
    expect(window.location.hash).toBe('#/expenses')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dépenses' })).toBeInTheDocument()
  })

  it('accède à la page Fournisseurs depuis Réglages, puis revient', async () => {
    window.location.hash = '#/settings'
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Réglages' })
    await userEvent.click(screen.getByRole('button', { name: /Gérer/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Fournisseurs' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/providers')
    expect(screen.getByText('Free Mobile')).toBeInTheDocument()
    await userEvent.click(document.querySelector('.back-link') as HTMLElement)
    expect(await screen.findByRole('heading', { level: 1, name: 'Réglages' })).toBeInTheDocument()
  })

  it('remonte en haut à chaque navigation', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo')
    render(<App />)
    await ready()
    scrollTo.mockClear()
    await userEvent.click(screen.getAllByRole('button', { name: /Abonnements/ })[0])
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('applique puis conserve le thème choisi', async () => {
    window.location.hash = '#/settings'
    const first = render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Réglages' })
    expect(document.documentElement.dataset.theme).toBe('dark')
    await userEvent.click(screen.getByRole('button', { name: 'Mode clair' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
    expect(localStorage.getItem('subly-theme')).toBe('light')
    first.unmount()

    // Rafraîchissement : le serveur renvoie encore l'ancien thème, le choix local gagne
    state.settings = { theme: 'dark', remindersEnabled: false }
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Réglages' })
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('utilise le thème distant sur un appareil sans préférence locale', async () => {
    state.settings = { theme: 'light', remindersEnabled: false }
    render(<App />)
    await ready()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('applique dès le premier rendu le thème mémorisé', async () => {
    localStorage.setItem('subly-theme', 'light')
    render(<App />)
    await ready()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('liste les abonnements et ouvre la modale d’ajout avec les nouveaux fournisseurs', async () => {
    window.location.hash = '#/subscriptions'
    render(<App />)
    await screen.findByRole('heading', { level: 1, name: 'Tous les abonnements' })
    expect(screen.getByRole('heading', { name: 'Netflix' })).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /Ajouter/ })[0])
    const dialog = await screen.findByRole('dialog', { name: 'Abonnement' })
    await userEvent.type(within(dialog).getByPlaceholderText(/Netflix, Claude/), 'Free')
    expect(within(dialog).getByText('Free Mobile')).toBeInTheDocument()
  })
})
