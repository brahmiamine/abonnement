import { describe, expect, it } from 'vitest'
import {
  MAX_ATTACHMENT_BYTES,
  formatFileSize,
  safeFileName,
  validateAttachment,
} from './attachments'

const file = (overrides: Partial<{ name: string; size: number; type: string }> = {}) => ({
  name: 'facture.pdf',
  size: 1000,
  type: 'application/pdf',
  ...overrides,
})

describe('validateAttachment', () => {
  it('accepte un PDF et les images courantes', () => {
    expect(validateAttachment(file())).toBeNull()
    expect(validateAttachment(file({ type: 'image/png' }))).toBeNull()
    expect(validateAttachment(file({ type: 'image/jpeg' }))).toBeNull()
    expect(validateAttachment(file({ type: 'image/webp' }))).toBeNull()
  })

  it('refuse les autres formats, notamment exécutables et HTML', () => {
    expect(validateAttachment(file({ type: 'text/html' }))).toMatch(/Format non pris en charge/)
    expect(validateAttachment(file({ type: 'application/x-msdownload' }))).toMatch(/Format/)
    expect(validateAttachment(file({ type: '' }))).toMatch(/Format/)
  })

  it('refuse un fichier vide ou trop gros', () => {
    expect(validateAttachment(file({ size: 0 }))).toMatch(/vide/)
    expect(validateAttachment(file({ size: MAX_ATTACHMENT_BYTES + 1 }))).toMatch(/5 Mo maximum/)
    expect(validateAttachment(file({ size: MAX_ATTACHMENT_BYTES }))).toBeNull()
  })
})

describe('safeFileName', () => {
  it('retire accents, espaces et dossiers', () => {
    expect(safeFileName('Facture été 2026.pdf')).toBe('Facture-ete-2026.pdf')
    expect(safeFileName('../../etc/passwd')).toBe('passwd')
    expect(safeFileName('C:\\docs\\contrat.pdf')).toBe('contrat.pdf')
  })

  it('ne renvoie jamais un nom vide ni caché', () => {
    expect(safeFileName('???')).toBe('fichier')
    expect(safeFileName('.env')).toBe('env')
  })
})

describe('formatFileSize', () => {
  it('choisit la bonne unité', () => {
    expect(formatFileSize(512)).toBe('512 o')
    expect(formatFileSize(2048)).toBe('2 Ko')
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1,5 Mo')
  })
})
