import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Attachment } from '../../domain/attachments'

const db = vi.hoisted(() => ({
  listAttachments: vi.fn(),
  uploadAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
  getAttachmentUrl: vi.fn(),
}))
vi.mock('../../lib/attachmentsDb', () => db)

const { AttachmentsPanel } = await import('./AttachmentsPanel')

const attachment = (overrides: Partial<Attachment> = {}): Attachment => ({
  id: 'a1',
  subscriptionId: 's1',
  name: 'facture.pdf',
  path: 'u1/s1/a1-facture.pdf',
  size: 2048,
  mimeType: 'application/pdf',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  Object.values(db).forEach((fn) => fn.mockReset())
  db.listAttachments.mockResolvedValue([])
})

const setup = () => render(<AttachmentsPanel subscriptionId="s1" userId="u1" />)
const input = () => screen.getByLabelText(/Ajouter un fichier/) as HTMLInputElement

describe('AttachmentsPanel', () => {
  it('liste les pièces jointes existantes', async () => {
    db.listAttachments.mockResolvedValue([attachment()])
    setup()
    expect(await screen.findByText('facture.pdf')).toBeInTheDocument()
    expect(screen.getByText('2 Ko')).toBeInTheDocument()
  })

  it('envoie un fichier valide et l’ajoute à la liste', async () => {
    db.uploadAttachment.mockResolvedValue(attachment({ id: 'a2', name: 'contrat.pdf' }))
    setup()
    await screen.findByText(/5 Mo maximum/)

    const file = new File(['%PDF-1.4'], 'contrat.pdf', { type: 'application/pdf' })
    await userEvent.upload(input(), file)

    expect(db.uploadAttachment).toHaveBeenCalledWith(file, 's1', 'u1')
    expect(await screen.findByText('contrat.pdf')).toBeInTheDocument()
  })

  it('refuse un format non pris en charge sans rien envoyer', async () => {
    setup()
    await screen.findByText(/5 Mo maximum/)
    // `accept` filtre déjà dans un vrai navigateur ; on le désactive pour tester notre propre validation.
    const user = userEvent.setup({ applyAccept: false })
    await user.upload(input(), new File(['<html>'], 'page.html', { type: 'text/html' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Format non pris en charge/)
    expect(db.uploadAttachment).not.toHaveBeenCalled()
  })

  it('affiche une erreur quand l’envoi échoue', async () => {
    db.uploadAttachment.mockRejectedValue(new Error('réseau'))
    setup()
    await screen.findByText(/5 Mo maximum/)
    await userEvent.upload(input(), new File(['x'], 'a.pdf', { type: 'application/pdf' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/L’envoi a échoué/)
  })

  it('ouvre le fichier via un lien temporaire', async () => {
    db.listAttachments.mockResolvedValue([attachment()])
    db.getAttachmentUrl.mockResolvedValue('https://signed.example/file')
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Ouvrir facture.pdf' }))
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith(
        'https://signed.example/file',
        '_blank',
        'noopener,noreferrer',
      ),
    )
  })

  it('supprime après confirmation', async () => {
    db.listAttachments.mockResolvedValue([attachment()])
    db.deleteAttachment.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer facture.pdf' }))
    await waitFor(() => expect(screen.queryByText('facture.pdf')).not.toBeInTheDocument())
    expect(db.deleteAttachment).toHaveBeenCalled()
  })

  it('ne supprime pas si on annule', async () => {
    db.listAttachments.mockResolvedValue([attachment()])
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Supprimer facture.pdf' }))
    expect(db.deleteAttachment).not.toHaveBeenCalled()
    expect(screen.getByText('facture.pdf')).toBeInTheDocument()
  })
})
