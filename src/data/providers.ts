import type { Provider } from '../types'

const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`

export const customLogo = (website?: string) =>
  website ? favicon(website.replace(/^https?:\/\//, '').split('/')[0]) : ''

/**
 * Fournisseurs ajoutés côté application. Ils sont insérés une seule fois dans
 * le catalogue de l'utilisateur (modifiables / supprimables ensuite).
 */
export const EXTRA_PROVIDERS: Provider[] = [
  {
    id: 'free-mobile',
    name: 'Free Mobile',
    category: 'Télécom',
    website: 'https://mobile.free.fr',
    logo: customLogo('mobile.free.fr'),
    color: '#cd1e25',
  },
  {
    id: 'strong8k-iptv',
    name: 'Strong8K IPTV',
    category: 'Streaming',
    website: 'https://strong8k.com',
    logo: customLogo('strong8k.com'),
    color: '#0f172a',
  },
  {
    id: 'trex-iptv',
    name: 'Trex IPTV',
    category: 'Streaming',
    website: 'https://trexiptv.com',
    logo: customLogo('trexiptv.com'),
    color: '#16a34a',
  },
  {
    id: 'king365-iptv',
    name: 'King365 IPTV',
    category: 'Streaming',
    website: 'https://king365tv.com',
    logo: customLogo('king365tv.com'),
    color: '#d4a017',
  },
]

const normalize = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')

/**
 * Retourne les fournisseurs additionnels à insérer : ni déjà présents (par id
 * ou par nom), ni déjà semés une fois (pour ne pas ressusciter un fournisseur
 * supprimé volontairement).
 */
export function missingExtraProviders(
  current: Provider[],
  alreadySeeded: string[] = [],
  extras: Provider[] = EXTRA_PROVIDERS,
): Provider[] {
  const ids = new Set(current.map((provider) => provider.id))
  const names = new Set(current.map((provider) => normalize(provider.name)))
  const seeded = new Set(alreadySeeded)

  return extras.filter(
    (provider) =>
      !seeded.has(provider.id) &&
      !ids.has(provider.id) &&
      !names.has(normalize(provider.name)),
  )
}
