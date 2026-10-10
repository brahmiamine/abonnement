import { describe, expect, it } from 'vitest'
import { advanceRenewalDate, daysUntil } from '../../../src/domain/subscriptions'
import {
  advance,
  daysBetween,
  dueReminders,
  localDateTime,
  nextRenewal,
  reminderKey,
  type SubscriptionRow,
} from './reminders'

const row = (overrides: Partial<SubscriptionRow> = {}): SubscriptionRow => ({
  id: 's1',
  user_id: 'u1',
  name: 'Netflix',
  price: 15.99,
  cycle: 'monthly',
  status: 'active',
  auto_renew: true,
  renewal_date: '2026-03-10',
  remind_days: [7, 3, 1, 0],
  ...overrides,
})

// 12 h UTC = 13 h ou 14 h à Paris selon la saison : toujours après l'heure d'envoi.
const at = (iso: string) => new Date(iso)

describe('parité avec le code de l’application', () => {
  it.each(['weekly', 'monthly', 'quarterly', 'yearly'] as const)('advance() = advanceRenewalDate() (%s)', (cycle) => {
    for (const date of ['2026-01-31', '2026-02-28', '2024-02-29', '2026-12-31', '2026-03-10']) {
      expect(advance(date, cycle)).toBe(advanceRenewalDate(date, cycle))
    }
  })

  it('daysBetween() = daysUntil()', () => {
    const now = new Date(2026, 2, 1, 12)
    for (const date of ['2026-03-01', '2026-03-04', '2026-02-20', '2026-12-25']) {
      expect(daysBetween('2026-03-01', date)).toBe(daysUntil(date, now))
    }
  })
})

describe('localDateTime', () => {
  it('convertit dans le fuseau demandé', () => {
    const instant = at('2026-03-10T23:30:00Z')
    expect(localDateTime(instant, 'Europe/Paris')).toEqual({ date: '2026-03-11', hour: 0 })
    expect(localDateTime(instant, 'America/New_York')).toEqual({ date: '2026-03-10', hour: 19 })
  })

  it('retombe sur UTC si le fuseau est inconnu', () => {
    expect(localDateTime(at('2026-03-10T08:00:00Z'), 'Mars/Olympus')).toEqual({ date: '2026-03-10', hour: 8 })
  })
})

describe('nextRenewal', () => {
  it('fait avancer un renouvellement automatique dépassé', () => {
    expect(nextRenewal(row({ renewal_date: '2026-01-10' }), '2026-03-12')).toBe('2026-04-10')
  })

  it('laisse tel quel un abonnement sans renouvellement automatique', () => {
    expect(nextRenewal(row({ auto_renew: false, renewal_date: '2026-01-10' }), '2026-03-12')).toBe('2026-01-10')
  })
})

describe('dueReminders', () => {
  it('prévient aux délais choisis', () => {
    const [reminder] = dueReminders([row()], at('2026-03-03T12:00:00Z'), 'Europe/Paris')
    expect(reminder).toMatchObject({ subscriptionId: 's1', renewalDate: '2026-03-10', daysBefore: 7 })
    expect(reminder.title).toBe('Netflix : renouvellement dans 7 j')
    expect(reminder.body).toMatch(/15,99\s€ · renouvellement automatique/)
  })

  it('utilise « aujourd’hui » le jour J', () => {
    const [reminder] = dueReminders([row()], at('2026-03-10T12:00:00Z'), 'Europe/Paris')
    expect(reminder.title).toBe('Netflix se renouvelle aujourd’hui')
  })

  it('ne dit rien les autres jours', () => {
    expect(dueReminders([row()], at('2026-03-05T12:00:00Z'), 'Europe/Paris')).toEqual([])
  })

  it('attend 9 h, heure locale de l’appareil', () => {
    const subs = [row()]
    expect(dueReminders(subs, at('2026-03-03T06:00:00Z'), 'Europe/Paris')).toEqual([]) // 7 h à Paris
    expect(dueReminders(subs, at('2026-03-03T08:00:00Z'), 'Europe/Paris')).toHaveLength(1) // 9 h
  })

  it('ignore les abonnements en pause', () => {
    expect(dueReminders([row({ status: 'paused' })], at('2026-03-03T12:00:00Z'), 'Europe/Paris')).toEqual([])
  })

  it('n’envoie pas deux fois le même rappel', () => {
    const sent = new Set([reminderKey('s1', '2026-03-10', 7)])
    expect(dueReminders([row()], at('2026-03-03T12:00:00Z'), 'Europe/Paris', sent)).toEqual([])
  })

  it('suit les renouvellements automatiques sans ouvrir l’application', () => {
    // Date enregistrée en janvier, jamais mise à jour : la prochaine échéance est le 10 avril.
    const stale = row({ renewal_date: '2026-01-10' })
    const [reminder] = dueReminders([stale], at('2026-04-03T12:00:00Z'), 'Europe/Paris')
    expect(reminder).toMatchObject({ renewalDate: '2026-04-10', daysBefore: 7 })
  })

  it('tolère remind_days vide', () => {
    expect(dueReminders([row({ remind_days: null })], at('2026-03-03T12:00:00Z'), 'Europe/Paris')).toEqual([])
  })
})
