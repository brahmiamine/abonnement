import type { Settings } from './types'

export const APP_URL = 'https://brahmiamine.github.io/abonnement/'
export const NOTIFIED_KEY = 'subly-notified-v1'

export const defaultSettings: Settings = {
  theme: 'dark',
  remindersEnabled: false,
}

export const isoToday = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const uid = () =>
  crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
