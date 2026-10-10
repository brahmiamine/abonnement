import { useEffect, useId, useRef, useState } from 'react'
import { ExternalLink, FileText, ImageIcon, Paperclip, RefreshCw, Trash2 } from 'lucide-react'
import {
  ATTACHMENT_ACCEPT,
  formatFileSize,
  validateAttachment,
  type Attachment,
} from '../../domain/attachments'
import {
  deleteAttachment,
  getAttachmentUrl,
  listAttachments,
  uploadAttachment,
} from '../../lib/attachmentsDb'

/** Factures et contrats d'un abonnement, stockés dans un bucket privé. */
export function AttachmentsPanel({
  subscriptionId,
  userId,
}: {
  subscriptionId: string
  userId: string
}) {
  const [items, setItems] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  useEffect(() => {
    let cancelled = false
    listAttachments(subscriptionId)
      .then((list) => {
        if (!cancelled) setItems(list)
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger les pièces jointes (connexion requise).')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [subscriptionId])

  const onFiles = async (files: FileList | null) => {
    const file = files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return

    const problem = validateAttachment(file)
    if (problem) {
      setError(problem)
      return
    }

    setBusy(true)
    setError('')
    try {
      const created = await uploadAttachment(file, subscriptionId, userId)
      setItems((current) => [created, ...current])
    } catch {
      setError('L’envoi a échoué. Vérifie ta connexion puis réessaie.')
    } finally {
      setBusy(false)
    }
  }

  const open = async (attachment: Attachment) => {
    try {
      const url = await getAttachmentUrl(attachment)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      setError('Impossible d’ouvrir ce fichier.')
    }
  }

  const remove = async (attachment: Attachment) => {
    if (!window.confirm(`Supprimer « ${attachment.name} » ?`)) return
    setBusy(true)
    try {
      await deleteAttachment(attachment)
      setItems((current) => current.filter((item) => item.id !== attachment.id))
      setError('')
    } catch {
      setError('Impossible de supprimer ce fichier.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="field attachments-panel">
      <div className="attachments-head">
        <span className="field-label">
          Pièces jointes <span>facture, contrat…</span>
        </span>
        <label className="secondary-btn attachment-add" htmlFor={inputId} aria-disabled={busy}>
          {busy ? <RefreshCw size={15} className="spin" /> : <Paperclip size={15} />}
          {busy ? 'Envoi…' : 'Ajouter un fichier'}
        </label>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          className="visually-hidden"
          disabled={busy}
          onChange={(event) => void onFiles(event.target.files)}
        />
      </div>

      {loading ? (
        <small className="field-help">Chargement…</small>
      ) : items.length === 0 ? (
        <small className="field-help">PDF, PNG, JPEG ou WebP · 5 Mo maximum par fichier.</small>
      ) : (
        <ul className="attachment-list">
          {items.map((item) => (
            <li key={item.id}>
              {item.mimeType === 'application/pdf' ? (
                <FileText size={18} />
              ) : (
                <ImageIcon size={18} />
              )}
              <span className="attachment-name">
                <strong>{item.name}</strong>
                <small>{formatFileSize(item.size)}</small>
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={() => void open(item)}
                aria-label={`Ouvrir ${item.name}`}
              >
                <ExternalLink size={16} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => void remove(item)}
                disabled={busy}
                aria-label={`Supprimer ${item.name}`}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="auth-message" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}
