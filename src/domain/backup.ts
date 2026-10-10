import type { Provider, Settings, Subscription } from '../types'

export type BackupPayload = {
  version: 2
  exportedAt: string
  subscriptions: Subscription[]
  providers: Provider[]
  settings: Settings
}

export const createBackup = (
  subscriptions: Subscription[],
  providers: Provider[],
  settings: Settings,
): BackupPayload => ({
  version: 2,
  exportedAt: new Date().toISOString(),
  subscriptions,
  providers,
  settings,
})

export const serializeBackup = (payload: BackupPayload) => JSON.stringify(payload, null, 2)

export const parseBackup = (text: string): BackupPayload => {
  const parsed = JSON.parse(text) as {
    version?: number
    exportedAt?: string
    subscriptions?: Subscription[]
    providers?: Provider[]
    settings?: Partial<Settings> & { monthlyBudget?: number }
  }

  if (!Array.isArray(parsed.subscriptions) || !parsed.settings) {
    throw new Error('Invalid Subly backup')
  }

  return {
    version: 2,
    exportedAt:
      typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    subscriptions: parsed.subscriptions,
    providers: Array.isArray(parsed.providers) ? parsed.providers : [],
    settings: {
      theme: parsed.settings.theme === 'light' ? 'light' : 'dark',
      remindersEnabled: Boolean(parsed.settings.remindersEnabled),
    },
  }
}
