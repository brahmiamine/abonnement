import { uid } from '../config'
import { safeFileName, type Attachment } from '../domain/attachments'
import { supabase } from './supabase'

export const ATTACHMENT_BUCKET = 'subscription-files'
const SIGNED_URL_SECONDS = 60

type AttachmentRow = {
  id: string
  subscription_id: string
  name: string
  path: string
  size: number
  mime_type: string
  created_at: string
}

const COLUMNS = 'id,subscription_id,name,path,size,mime_type,created_at'

const fromRow = (row: AttachmentRow): Attachment => ({
  id: row.id,
  subscriptionId: row.subscription_id,
  name: row.name,
  path: row.path,
  size: Number(row.size),
  mimeType: row.mime_type,
  createdAt: row.created_at,
})

export async function listAttachments(subscriptionId: string): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('subscription_attachments')
    .select(COLUMNS)
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as AttachmentRow[]).map(fromRow)
}

export async function uploadAttachment(
  file: File,
  subscriptionId: string,
  userId: string,
): Promise<Attachment> {
  const id = uid()
  // Le premier segment du chemin est l'identifiant de l'utilisateur : c'est ce que vérifie la RLS du bucket.
  const path = `${userId}/${subscriptionId}/${id}-${safeFileName(file.name)}`

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('subscription_attachments')
    .insert({
      id,
      user_id: userId,
      subscription_id: subscriptionId,
      name: file.name.slice(0, 200),
      path,
      size: file.size,
      mime_type: file.type,
    })
    .select(COLUMNS)
    .single()

  if (error) {
    // Pas de fichier orphelin si l'enregistrement en base échoue.
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([path])
    throw error
  }
  return fromRow(data as AttachmentRow)
}

export async function deleteAttachment(attachment: Attachment) {
  const { error: storageError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .remove([attachment.path])
  if (storageError) throw storageError

  const { error } = await supabase.from('subscription_attachments').delete().eq('id', attachment.id)
  if (error) throw error
}

/** Lien temporaire (1 min) : le bucket est privé, aucune URL publique n'existe. */
export async function getAttachmentUrl(attachment: Attachment) {
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(attachment.path, SIGNED_URL_SECONDS)
  if (error) throw error
  return data.signedUrl
}

/** Supprime les fichiers d'un abonnement (les lignes partent avec lui, pas le stockage). */
export async function removeSubscriptionFiles(subscriptionId: string) {
  const attachments = await listAttachments(subscriptionId)
  if (!attachments.length) return
  const { error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .remove(attachments.map((item) => item.path))
  if (error) throw error
}
