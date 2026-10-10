import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SettingsView } from './SettingsView'

const setup = (overrides: Partial<React.ComponentProps<typeof SettingsView>> = {}) => {
  const props: React.ComponentProps<typeof SettingsView> = {
    settings: { theme: 'dark', remindersEnabled: false },
    email: 'moi@exemple.fr',
    providerCount: 8,
    installAvailable: false,
    pushActive: false,
    onEnableNotifications: vi.fn(async () => {}),
    onDisableNotifications: vi.fn(async () => {}),
    onToggleTheme: vi.fn(),
    onInstall: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(async () => {}),
    onOpenProviders: vi.fn(),
    onSignOut: vi.fn(async () => {}),
    onClearSubscriptions: vi.fn(async () => {}),
    ...overrides,
  }
  render(<SettingsView {...props} />)
  return props
}

describe('SettingsView', () => {
  it('renvoie vers la page Fournisseurs au lieu d’afficher le catalogue', async () => {
    const props = setup()
    expect(screen.getByText(/8 fournisseurs/)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Rechercher un fournisseur…')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Gérer/ }))
    expect(props.onOpenProviders).toHaveBeenCalledOnce()
  })

  it('accorde le singulier', () => {
    setup({ providerCount: 1 })
    expect(screen.getByText(/1 fournisseur dans/)).toBeInTheDocument()
  })

  it('affiche l’e-mail du compte', () => {
    setup()
    expect(screen.getByText(/moi@exemple.fr/)).toBeInTheDocument()
  })

  it('propose le bon libellé de thème', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Mode clair' }))
    expect(props.onToggleTheme).toHaveBeenCalledOnce()
  })

  it('indique que les rappels sont activés', () => {
    setup({ settings: { theme: 'light', remindersEnabled: true } })
    expect(screen.getByRole('button', { name: /Activés/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mode sombre' })).toBeInTheDocument()
  })

  it('désactive les notifications depuis le bouton « Activés »', async () => {
    const props = setup({ settings: { theme: 'dark', remindersEnabled: true } })
    await userEvent.click(screen.getByRole('button', { name: /Désactiver/ }))
    expect(props.onDisableNotifications).toHaveBeenCalledOnce()
  })

  it('explique la différence entre push serveur et notifications locales', () => {
    const { unmount } = render(<div />)
    unmount()
    setup({ settings: { theme: 'dark', remindersEnabled: true }, pushActive: true })
    expect(screen.getByText(/même application fermée/)).toBeInTheDocument()
  })

  it('prévient quand seules les notifications locales sont possibles', () => {
    setup({ settings: { theme: 'dark', remindersEnabled: true }, pushActive: false })
    expect(screen.getByText(/tant que Subly est ouvert/)).toBeInTheDocument()
  })

  it('active les notifications', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: /Activer/ }))
    expect(props.onEnableNotifications).toHaveBeenCalledOnce()
  })

  it('masque Installer quand ce n’est pas possible puis l’affiche', async () => {
    const { unmount } = render(<div />)
    unmount()
    setup()
    expect(screen.queryByRole('button', { name: /Installer/ })).toBeNull()
  })

  it('installe l’application si disponible', async () => {
    const props = setup({ installAvailable: true })
    await userEvent.click(screen.getByRole('button', { name: /Installer/ }))
    expect(props.onInstall).toHaveBeenCalledOnce()
  })

  it('exporte, se déconnecte et efface', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: /Exporter/ }))
    await userEvent.click(screen.getByRole('button', { name: /Déconnexion/ }))
    await userEvent.click(screen.getByRole('button', { name: /Effacer/ }))
    expect(props.onExport).toHaveBeenCalled()
    expect(props.onSignOut).toHaveBeenCalled()
    expect(props.onClearSubscriptions).toHaveBeenCalled()
  })

  it('importe le fichier choisi', async () => {
    const props = setup()
    const file = new File(['{}'], 'backup.json', { type: 'application/json' })
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, file)
    expect(props.onImport).toHaveBeenCalledWith(file)
  })
})
