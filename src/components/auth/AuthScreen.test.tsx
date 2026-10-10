import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({ supabase: { auth } }))

const { AuthScreen } = await import('./AuthScreen')

beforeEach(() => {
  Object.values(auth).forEach((fn) => fn.mockReset().mockResolvedValue({ data: {}, error: null }))
})

describe('AuthScreen — lien magique', () => {
  it('envoie un lien de connexion sans demander de mot de passe', async () => {
    render(<AuthScreen />)
    await userEvent.click(screen.getByRole('button', { name: /lien de connexion par e-mail/i }))

    expect(screen.getByRole('heading', { name: 'Connexion par e-mail' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Mot de passe')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'moi@exemple.fr')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }))

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'moi@exemple.fr',
      options: expect.objectContaining({
        emailRedirectTo: expect.stringContaining('/abonnement/'),
      }),
    })
    expect(await screen.findByText(/un clic te connecte/)).toBeInTheDocument()
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('affiche l’erreur renvoyée par Supabase', async () => {
    auth.signInWithOtp.mockResolvedValue({ data: {}, error: new Error('Trop de demandes') })
    render(<AuthScreen />)
    await userEvent.click(screen.getByRole('button', { name: /lien de connexion par e-mail/i }))
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'moi@exemple.fr')
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le lien' }))
    expect(await screen.findByText('Trop de demandes')).toBeInTheDocument()
  })

  it('permet de revenir au mot de passe', async () => {
    render(<AuthScreen />)
    await userEvent.click(screen.getByRole('button', { name: /lien de connexion par e-mail/i }))
    await userEvent.click(screen.getByRole('button', { name: /Retour à la connexion/ }))
    expect(screen.getByLabelText('Mot de passe')).toBeInTheDocument()
  })
})

describe('AuthScreen — mot de passe', () => {
  it('connecte avec l’e-mail et le mot de passe', async () => {
    render(<AuthScreen />)
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'moi@exemple.fr')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'moi@exemple.fr',
      password: 'secret',
    })
  })

  it('refuse à l’inscription un mot de passe sans chiffre', async () => {
    render(<AuthScreen />)
    await userEvent.click(screen.getByRole('button', { name: /Créer un compte/ }))
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'moi@exemple.fr')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'uniquementdeslettres')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le compte' }))

    expect(await screen.findByText(/au moins une lettre et un chiffre/)).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('crée le compte avec un mot de passe conforme', async () => {
    render(<AuthScreen />)
    await userEvent.click(screen.getByRole('button', { name: /Créer un compte/ }))
    await userEvent.type(screen.getByLabelText('Adresse e-mail'), 'moi@exemple.fr')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'chat-et-souris-42')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le compte' }))
    expect(auth.signUp).toHaveBeenCalled()
  })
})
