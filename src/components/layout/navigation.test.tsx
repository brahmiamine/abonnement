import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

describe('MobileNav', () => {
  it('met en avant l’onglet courant et appelle onView', async () => {
    const onView = vi.fn()
    render(<MobileNav view="home" onView={onView} onAdd={() => {}} />)
    expect(screen.getByRole('button', { name: 'Accueil' })).toHaveClass('active')
    await userEvent.click(screen.getByRole('button', { name: 'Dépenses' }))
    expect(onView).toHaveBeenCalledWith('expenses')
  })

  it('garde Réglages actif sur la page Fournisseurs', () => {
    render(<MobileNav view="providers" onView={() => {}} onAdd={() => {}} />)
    expect(screen.getByRole('button', { name: 'Réglages' })).toHaveClass('active')
  })

  it('déclenche l’ajout avec le bouton +', async () => {
    const onAdd = vi.fn()
    const { container } = render(<MobileNav view="home" onView={() => {}} onAdd={onAdd} />)
    await userEvent.click(container.querySelector('.mobile-add')!)
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('est étiquetée pour l’accessibilité', () => {
    render(<MobileNav view="home" onView={() => {}} onAdd={() => {}} />)
    expect(screen.getByRole('navigation', { name: 'Navigation mobile' })).toBeInTheDocument()
  })
})

describe('Sidebar', () => {
  const props = { subscriptionCount: 7, monthly: 12.5, annual: 150, onView: () => {} }

  it('affiche le nombre d’abonnements et les totaux', () => {
    render(<Sidebar view="home" {...props} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText(/12,50/)).toBeInTheDocument()
  })

  it('garde Réglages actif sur la page Fournisseurs', () => {
    render(<Sidebar view="providers" {...props} />)
    expect(screen.getByRole('button', { name: /Réglages/ })).toHaveClass('active')
    expect(screen.getByRole('button', { name: /Vue d’ensemble/ })).not.toHaveClass('active')
  })

  it('navigue au clic', async () => {
    const onView = vi.fn()
    render(<Sidebar view="home" {...props} onView={onView} />)
    await userEvent.click(screen.getByRole('button', { name: /Abonnements/ }))
    expect(onView).toHaveBeenCalledWith('subscriptions')
  })
})

describe('Topbar', () => {
  const base = {
    syncState: 'idle' as const,
    settings: { theme: 'dark' as const, remindersEnabled: false },
    installAvailable: false,
    onInstall: () => {},
    onToggleTheme: () => {},
    onAdd: () => {},
  }

  it.each([
    ['home', 'Mes abonnements'],
    ['subscriptions', 'Tous les abonnements'],
    ['expenses', 'Dépenses'],
    ['settings', 'Réglages'],
    ['providers', 'Fournisseurs'],
  ] as const)('titre de la vue %s', (view, title) => {
    render(<Topbar view={view} {...base} />)
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })

  it.each([
    ['idle', 'Synchronisé'],
    ['syncing', 'Synchro…'],
    ['error', 'Erreur de synchro'],
  ] as const)('état de synchro %s', (syncState, text) => {
    render(<Topbar view="home" {...base} syncState={syncState} />)
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('affiche Installer seulement si disponible', () => {
    const { rerender } = render(<Topbar view="home" {...base} />)
    expect(screen.queryByRole('button', { name: /Installer/ })).toBeNull()
    rerender(<Topbar view="home" {...base} installAvailable />)
    expect(screen.getByRole('button', { name: /Installer/ })).toBeInTheDocument()
  })

  it('bascule le thème', async () => {
    const onToggleTheme = vi.fn()
    render(<Topbar view="home" {...base} onToggleTheme={onToggleTheme} />)
    await userEvent.click(screen.getByRole('button', { name: 'Changer de thème' }))
    expect(onToggleTheme).toHaveBeenCalledOnce()
  })
})
