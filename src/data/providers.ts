import type { Provider } from '../types'

const si = (slug: string) => `https://cdn.simpleicons.org/${slug}`
const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`

export const providers: Provider[] = [
  { id: 'netflix', name: 'Netflix', category: 'Streaming', logo: si('netflix'), website: 'https://netflix.com', color: '#E50914' },
  { id: 'disney', name: 'Disney+', category: 'Streaming', logo: si('disneyplus'), website: 'https://disneyplus.com', color: '#113CCF' },
  { id: 'prime', name: 'Prime Video', category: 'Streaming', logo: si('primevideo'), website: 'https://primevideo.com', color: '#00A8E1' },
  { id: 'canal', name: 'CANAL+', category: 'Streaming', logo: si('canalplus'), website: 'https://canalplus.com', color: '#111111' },
  { id: 'crunchyroll', name: 'Crunchyroll', category: 'Streaming', logo: si('crunchyroll'), website: 'https://crunchyroll.com', color: '#F47521' },
  { id: 'spotify', name: 'Spotify', category: 'Musique', logo: si('spotify'), website: 'https://spotify.com', color: '#1ED760' },
  { id: 'youtube', name: 'YouTube Premium', category: 'Streaming', logo: si('youtube'), website: 'https://youtube.com/premium', color: '#FF0000' },
  { id: 'deezer', name: 'Deezer', category: 'Musique', logo: si('deezer'), website: 'https://deezer.com', color: '#A238FF' },
  { id: 'applemusic', name: 'Apple Music', category: 'Musique', logo: si('applemusic'), website: 'https://music.apple.com', color: '#FA243C' },
  { id: 'chatgpt', name: 'ChatGPT', category: 'IA', logo: si('openai'), website: 'https://chatgpt.com', color: '#10A37F' },
  { id: 'claude', name: 'Claude', category: 'IA', logo: si('anthropic'), website: 'https://claude.ai', color: '#D97757' },
  { id: 'gemini', name: 'Google Gemini', category: 'IA', logo: si('googlegemini'), website: 'https://gemini.google.com', color: '#4E82EE' },
  { id: 'midjourney', name: 'Midjourney', category: 'IA', logo: favicon('midjourney.com'), website: 'https://midjourney.com', color: '#111827' },
  { id: 'github', name: 'GitHub', category: 'Productivité', logo: si('github'), website: 'https://github.com', color: '#24292F' },
  { id: 'notion', name: 'Notion', category: 'Productivité', logo: si('notion'), website: 'https://notion.so', color: '#111111' },
  { id: 'figma', name: 'Figma', category: 'Productivité', logo: si('figma'), website: 'https://figma.com', color: '#F24E1E' },
  { id: 'canva', name: 'Canva', category: 'Productivité', logo: si('canva'), website: 'https://canva.com', color: '#00C4CC' },
  { id: 'microsoft365', name: 'Microsoft 365', category: 'Productivité', logo: si('microsoft365'), website: 'https://microsoft.com/microsoft-365', color: '#D83B01' },
  { id: 'adobe', name: 'Adobe Creative Cloud', category: 'Productivité', logo: si('adobecreativecloud'), website: 'https://adobe.com/creativecloud.html', color: '#DA1F26' },
  { id: 'googleone', name: 'Google One', category: 'Cloud', logo: si('googleone'), website: 'https://one.google.com', color: '#4285F4' },
  { id: 'icloud', name: 'iCloud+', category: 'Cloud', logo: si('icloud'), website: 'https://icloud.com', color: '#3693F3' },
  { id: 'dropbox', name: 'Dropbox', category: 'Cloud', logo: si('dropbox'), website: 'https://dropbox.com', color: '#0061FF' },
  { id: 'xbox', name: 'Xbox Game Pass', category: 'Gaming', logo: si('xbox'), website: 'https://xbox.com/gamepass', color: '#107C10' },
  { id: 'playstation', name: 'PlayStation Plus', category: 'Gaming', logo: si('playstation'), website: 'https://playstation.com/ps-plus', color: '#0070D1' },
  { id: 'nintendo', name: 'Nintendo Switch Online', category: 'Gaming', logo: si('nintendoswitch'), website: 'https://nintendo.com', color: '#E60012' },
  { id: 'dazn', name: 'DAZN', category: 'Sport', logo: si('dazn'), website: 'https://dazn.com', color: '#F8F8F5' },
  { id: 'beinsports', name: 'beIN SPORTS', category: 'Sport', logo: favicon('beinsports.com'), website: 'https://beinsports.com', color: '#5C2D91' },
  { id: 'orange', name: 'Orange', category: 'Télécom', logo: si('orange'), website: 'https://orange.fr', color: '#FF7900' },
  { id: 'free', name: 'Free', category: 'Télécom', logo: favicon('free.fr'), website: 'https://free.fr', color: '#CD1F2B' },
  { id: 'sfr', name: 'SFR', category: 'Télécom', logo: favicon('sfr.fr'), website: 'https://sfr.fr', color: '#E2001A' },
  { id: 'bouygues', name: 'Bouygues Telecom', category: 'Télécom', logo: favicon('bouyguestelecom.fr'), website: 'https://bouyguestelecom.fr', color: '#009FE3' },
]

export const categories = ['Streaming', 'Musique', 'IA', 'Cloud', 'Productivité', 'Gaming', 'Sport', 'Télécom', 'Autre'] as const

export const customLogo = (website?: string) =>
  website ? favicon(website.replace(/^https?:\/\//, '').split('/')[0]) : ''
