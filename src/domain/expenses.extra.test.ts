import { describe, expect, it } from 'vitest'
import { subscription } from '../test/fixtures'
import { expenseSummary, expensesByCategory } from './expenses'

describe('dépenses : cas limites', () => {
  it('gère une liste vide', () => {
    const summary = expenseSummary([])
    expect(summary).toMatchObject({ monthly: 0, annual: 0, activeCount: 0, averageMonthly: 0 })
    expect(summary.mostExpensive).toBeUndefined()
    expect(expensesByCategory([])).toEqual([])
  })

  it('exclut les abonnements en pause', () => {
    const items = [
      subscription({ price: 10 }),
      subscription({ id: 'b', price: 99, status: 'paused' }),
    ]
    expect(expenseSummary(items).monthly).toBe(10)
    expect(expensesByCategory(items)).toEqual([['Streaming', 10]])
  })

  it('compte les essais comme actifs', () => {
    expect(expenseSummary([subscription({ status: 'trial' })]).activeCount).toBe(1)
  })

  it('trie les catégories par montant décroissant', () => {
    const result = expensesByCategory([
      subscription({ id: 'a', category: 'Cloud', price: 2 }),
      subscription({ id: 'b', category: 'IA', price: 20 }),
      subscription({ id: 'c', category: 'Cloud', price: 3 }),
    ])
    expect(result).toEqual([
      ['IA', 20],
      ['Cloud', 5],
    ])
  })
})
