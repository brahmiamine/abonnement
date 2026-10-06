import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { provider } from '../test/fixtures'
import { ProvidersView } from './ProvidersView'

const categories = ['Streaming', 'Télécom', 'Autre'] as const

const setup = (providers = [
  provider(),
  provider({ id: 'free-mobile', name: 'Free Mobile', category: 'Télécom', website: 'https://mobile.free.fr' }),
]) => {
  const props = {
    providers,
    categories: [...categories],
    onBack: vi.fn(),
    onSave: vi.fn(async () => {}),
    onDelete: vi.fn(async () => {}),
  }
  render(<ProvidersView {...props} />)
  return props
}

describe('ProvidersView', () => {
  it('liste les fournisseurs avec leur catégorie et domaine', () => {
    setup()
    const row = screen.getByText('Free Mobile').closest('.provider-admin-row') as HTMLElement
    expect(within(row).getByText(/Télécom · mobile.free.fr/)).toBeInTheDocument()
  })

  it('revient aux réglages', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: /Réglages/ }))
    expect(props.onBack).toHaveBeenCalledOnce()
  })

  it('filtre par nom ou catégorie', async () => {
    setup()
    await userEvent.type(screen.getByPlaceholderText('Rechercher un fournisseur…'), 'télécom')
    expect(screen.getByText('Free Mobile')).toBeInTheDocument()
    expect(screen.queryByText('Netflix')).toBeNull()
    await userEvent.clear(screen.getByPlaceholderText('Rechercher un fournisseur…'))
    await userEvent.type(screen.getByPlaceholderText('Rechercher un fournisseur…'), 'zzz')
    expect(screen.getByText('Aucun fournisseur trouvé.')).toBeInTheDocument()
  })

  it('ajoute un fournisseur avec un logo déduit du site', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: /Ajouter/ }))
    await userEvent.type(screen.getByPlaceholderText('Ex. RED by SFR Mobile'), '  Mon IPTV ')
    await userEvent.type(screen.getAllByPlaceholderText('https://…')[0], 'https://mon-iptv.tv')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(props.onSave).toHaveBeenCalledOnce())
    const saved = (props.onSave.mock.calls[0] as unknown as [ReturnType<typeof provider>])[0]
    expect(saved.name).toBe('Mon IPTV')
    expect(saved.logo).toContain('domain=mon-iptv.tv')
    expect(saved.id).toMatch(/^custom-/)
  })

  it('modifie un fournisseur existant', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Modifier Netflix' }))
    const name = screen.getByDisplayValue('Netflix')
    await userEvent.clear(name)
    await userEvent.type(name, 'Netflix Premium')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(props.onSave).toHaveBeenCalled())
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'netflix', name: 'Netflix Premium' }))
  })

  it('affiche une erreur si l’enregistrement échoue et garde la fenêtre ouverte', async () => {
    const props = setup()
    props.onSave.mockRejectedValueOnce(new Error('x'))
    await userEvent.click(screen.getByRole('button', { name: /Ajouter/ }))
    await userEvent.type(screen.getByPlaceholderText('Ex. RED by SFR Mobile'), 'X')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Impossible d’enregistrer le fournisseur.')).toBeInTheDocument()
  })

  it('n’enregistre pas un nom vide', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: /Ajouter/ }))
    await userEvent.type(screen.getByPlaceholderText('Ex. RED by SFR Mobile'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(props.onSave).not.toHaveBeenCalled()
  })

  it('annule l’édition', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /Ajouter/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByPlaceholderText('Ex. RED by SFR Mobile')).toBeNull()
  })

  it('supprime un fournisseur', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer Free Mobile' }))
    expect(props.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'free-mobile' }))
  })
})
