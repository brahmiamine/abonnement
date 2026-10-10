export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

export const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_TYPES.join(',')

export type Attachment = {
  id: string
  subscriptionId: string
  name: string
  path: string
  size: number
  mimeType: string
  createdAt: string
}

/** Message d'erreur si le fichier est refusé, sinon `null`. */
export function validateAttachment(file: { name: string; size: number; type: string }) {
  if (!(ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
    return 'Format non pris en charge : PDF, PNG, JPEG ou WebP uniquement.'
  }
  if (file.size === 0) return 'Ce fichier est vide.'
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `Fichier trop volumineux (${formatFileSize(file.size)}) : 5 Mo maximum.`
  }
  return null
}

/** Nom utilisable dans un chemin de stockage (sans dossier ni caractère exotique). */
export function safeFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? ''
  const cleaned = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^[.-]+|-+$/g, '')
    .slice(-100)
  return cleaned || 'fichier'
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`
}
