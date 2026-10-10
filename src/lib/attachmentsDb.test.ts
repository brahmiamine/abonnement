import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({
  uploads: [] as string[],
  removed: [] as string[][],
  insertError: null as null | Error,
  rows: [] as Array<Record<string, unknown>>,
}))

vi.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: async (path: string) => {
          store.uploads.push(path)
          return { error: null }
        },
        remove: async (paths: string[]) => {
          store.removed.push(paths)
          return { error: null }
        },
        createSignedUrl: async (path: string, seconds: number) => ({
          data: { signedUrl: `https://signed/${path}?t=${seconds}` },
          error: null,
        }),
      }),
    },
    from: () => ({
      insert: (row: Record<string, unknown>) => ({
        select: () => ({
          single: async () =>
            store.insertError
              ? { data: null, error: store.insertError }
              : {
                  data: { ...row, created_at: '2026-01-01T00:00:00Z' },
                  error: null,
                },
        }),
      }),
      select: () => ({
        eq: () => ({
          order: async () => ({ data: store.rows, error: null }),
        }),
      }),
    }),
  },
}))

const { uploadAttachment, getAttachmentUrl, removeSubscriptionFiles } =
  await import('./attachmentsDb')

beforeEach(() => {
  store.uploads = []
  store.removed = []
  store.insertError = null
  store.rows = []
})

const file = new File(['x'], 'Facture été.pdf', { type: 'application/pdf' })

describe('attachmentsDb', () => {
  it('range le fichier dans le dossier de l’utilisateur (exigé par la RLS)', async () => {
    const created = await uploadAttachment(file, 'sub-1', 'user-1')
    expect(store.uploads[0]).toMatch(/^user-1\/sub-1\/.+-Facture-ete\.pdf$/)
    expect(created.path).toBe(store.uploads[0])
    expect(created.name).toBe('Facture été.pdf')
    expect(created.subscriptionId).toBe('sub-1')
  })

  it('supprime le fichier envoyé si l’enregistrement en base échoue', async () => {
    store.insertError = new Error('RLS')
    await expect(uploadAttachment(file, 'sub-1', 'user-1')).rejects.toThrow('RLS')
    expect(store.removed).toEqual([[store.uploads[0]]])
  })

  it('génère un lien temporaire d’une minute', async () => {
    const url = await getAttachmentUrl({
      id: 'a',
      subscriptionId: 's',
      name: 'f.pdf',
      path: 'u/s/f.pdf',
      size: 1,
      mimeType: 'application/pdf',
      createdAt: '',
    })
    expect(url).toBe('https://signed/u/s/f.pdf?t=60')
  })

  it('supprime tous les fichiers d’un abonnement', async () => {
    store.rows = [
      {
        id: '1',
        subscription_id: 's',
        name: 'a',
        path: 'u/s/1',
        size: 1,
        mime_type: 'application/pdf',
        created_at: '',
      },
      {
        id: '2',
        subscription_id: 's',
        name: 'b',
        path: 'u/s/2',
        size: 1,
        mime_type: 'image/png',
        created_at: '',
      },
    ]
    await removeSubscriptionFiles('s')
    expect(store.removed).toEqual([['u/s/1', 'u/s/2']])
  })

  it('ne fait rien sans pièce jointe', async () => {
    await removeSubscriptionFiles('s')
    expect(store.removed).toEqual([])
  })
})
