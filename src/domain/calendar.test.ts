import { describe, expect, it } from 'vitest'
import { subscription } from '../test/fixtures'
import { buildMonth, occurrencesBetween } from './calendar'
import { shiftRenewalDate } from './subscriptions'

describe('shiftRenewalDate', () => {
  it('garde le 31 d’un mois sur l’autre en repartant de l’ancre', () => {
    expect(shiftRenewalDate('2026-01-31', 'monthly', 1)).toBe('2026-02-28')
    expect(shiftRenewalDate('2026-01-31', 'monthly', 2)).toBe('2026-03-31')
    expect(shiftRenewalDate('2026-01-31', 'monthly', -1)).toBe('2025-12-31')
  })

  it('gère les semaines, trimestres et années', () => {
    expect(shiftRenewalDate('2026-01-01', 'weekly', 2)).toBe('2026-01-15')
    expect(shiftRenewalDate('2026-01-15', 'quarterly', 1)).toBe('2026-04-15')
    expect(shiftRenewalDate('2024-02-29', 'yearly', 1)).toBe('2025-02-28')
  })
})

describe('occurrencesBetween', () => {
  it('répète un abonnement mensuel, passé compris', () => {
    const item = subscription({
      startDate: '2026-01-10',
      renewalDate: '2026-04-10',
      cycle: 'monthly',
    })
    expect(occurrencesBetween(item, '2026-01-01', '2026-06-30')).toEqual([
      '2026-01-10',
      '2026-02-10',
      '2026-03-10',
      '2026-04-10',
      '2026-05-10',
      '2026-06-10',
    ])
  })

  it('n’invente pas de paiement avant la date de début', () => {
    const item = subscription({ startDate: '2026-03-01', renewalDate: '2026-04-01' })
    expect(occurrencesBetween(item, '2026-01-01', '2026-04-30')).toEqual([
      '2026-03-01',
      '2026-04-01',
    ])
  })

  it('compte les paiements hebdomadaires d’un mois', () => {
    const item = subscription({
      cycle: 'weekly',
      startDate: '2026-01-01',
      renewalDate: '2026-01-05',
    })
    expect(occurrencesBetween(item, '2026-02-01', '2026-02-28')).toEqual([
      '2026-02-02',
      '2026-02-09',
      '2026-02-16',
      '2026-02-23',
    ])
  })

  it('ne garde que l’échéance sans renouvellement automatique', () => {
    const item = subscription({
      autoRenew: false,
      renewalDate: '2026-05-10',
      expirationDate: '2026-05-10',
    })
    expect(occurrencesBetween(item, '2026-01-01', '2026-12-31')).toEqual(['2026-05-10'])
    expect(occurrencesBetween(item, '2026-06-01', '2026-12-31')).toEqual([])
  })

  it('ignore les abonnements en pause et respecte la date de fin', () => {
    expect(
      occurrencesBetween(subscription({ status: 'paused' }), '2026-01-01', '2099-12-31'),
    ).toEqual([])
    const ending = subscription({
      startDate: '2026-01-10',
      renewalDate: '2026-01-10',
      expirationDate: '2026-02-20',
    })
    expect(occurrencesBetween(ending, '2026-01-01', '2026-06-30')).toEqual([
      '2026-01-10',
      '2026-02-10',
    ])
  })
})

describe('buildMonth', () => {
  it('commence la grille le lundi et la complète par semaines entières', () => {
    const month = buildMonth([], 2026, 1) // février 2026 : du dimanche 1er au samedi 28
    expect(month.days[0].date).toBe('2026-01-26')
    expect(month.days).toHaveLength(35)
    expect(
      month.days.every(
        (day, index) => index % 7 !== 0 || new Date(`${day.date}T12:00`).getDay() === 1,
      ),
    ).toBe(true)
    expect(month.days.filter((day) => day.inMonth)).toHaveLength(28)
  })

  it('place les échéances et totalise le mois', () => {
    const items = [
      subscription({ id: 'a', price: 10, startDate: '2026-01-01', renewalDate: '2026-02-05' }),
      subscription({ id: 'b', price: 5, startDate: '2026-01-01', renewalDate: '2026-02-05' }),
      subscription({
        id: 'c',
        price: 120,
        cycle: 'yearly',
        startDate: '2025-03-01',
        renewalDate: '2026-03-01',
      }),
    ]
    const month = buildMonth(items, 2026, 1)
    const fifth = month.days.find((day) => day.date === '2026-02-05')!
    expect(fifth.items.map((item) => item.id)).toEqual(['a', 'b'])
    expect(fifth.total).toBe(15)
    expect(month.monthTotal).toBe(15)
    expect(month.paymentCount).toBe(2)
  })

  it('n’affiche pas les jours des mois voisins dans le total', () => {
    const item = subscription({ price: 8, startDate: '2026-01-01', renewalDate: '2026-01-28' })
    const march = buildMonth([item], 2026, 2)
    const spill = march.days.find((day) => day.date === '2026-02-28')
    expect(spill?.inMonth).toBe(false)
    expect(march.monthTotal).toBe(8) // seulement le 28 mars
  })
})
