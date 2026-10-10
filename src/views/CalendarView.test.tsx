import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscription } from '../test/fixtures'
import { CalendarView } from './CalendarView'

const items = [
  subscription({
    id: 'n',
    name: 'Netflix',
    price: 15,
    startDate: '2026-01-05',
    renewalDate: '2026-03-05',
  }),
  subscription({
    id: 's',
    name: 'Spotify',
    price: 10,
    startDate: '2026-01-05',
    renewalDate: '2026-03-05',
  }),
  subscription({
    id: 'c',
    name: 'iCloud',
    price: 3,
    startDate: '2026-01-20',
    renewalDate: '2026-03-20',
  }),
]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 2, 10, 12)) // 10 mars 2026
})
afterEach(() => vi.useRealTimers())

const setup = () => {
  const onEdit = vi.fn()
  const onList = vi.fn()
  render(<CalendarView subscriptions={items} onEdit={onEdit} onList={onList} />)
  return { onEdit, onList }
}

describe('CalendarView', () => {
  it('affiche le mois courant et le total à payer', () => {
    setup()
    expect(screen.getByRole('heading', { level: 2, name: /mars 2026/i })).toBeInTheDocument()
    expect(screen.getByText(/28,00\s€/)).toBeInTheDocument() // 15 + 10 + 3
    expect(screen.getByText(/3 paiements/)).toBeInTheDocument()
  })

  it('décrit chaque jour pour les lecteurs d’écran', () => {
    setup()
    expect(
      screen.getByRole('button', { name: /^jeudi 5 mars : 2 paiements, 25,00\s€/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^mercredi 11 mars : aucun paiement/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^mardi 10 mars/ })).toHaveAttribute(
      'aria-current',
      'date',
    )
  })

  it('montre le détail du jour choisi et permet de modifier', async () => {
    const { onEdit } = setup()
    await userEvent.click(screen.getByRole('button', { name: /^jeudi 5 mars/ }))
    const detail = screen.getByRole('heading', { level: 3, name: /5 mars/i }).parentElement!
    expect(within(detail).getByText('Netflix')).toBeInTheDocument()
    expect(within(detail).getByText('Spotify')).toBeInTheDocument()

    await userEvent.click(within(detail).getAllByRole('button', { name: 'Modifier' })[0])
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'n' }))
  })

  it('navigue entre les mois et revient à aujourd’hui', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'Mois suivant' }))
    expect(screen.getByRole('heading', { level: 2, name: /avril 2026/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^dimanche 5 avril : 2 paiements/ }),
    ).toBeInTheDocument()

    for (let i = 0; i < 3; i += 1) {
      await userEvent.click(screen.getByRole('button', { name: 'Mois précédent' }))
    }
    expect(screen.getByRole('heading', { level: 2, name: /janvier 2026/i })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Aujourd’hui' }))
    expect(screen.getByRole('heading', { level: 2, name: /mars 2026/i })).toBeInTheDocument()
  })

  it('revient à la liste', async () => {
    const { onList } = setup()
    await userEvent.click(screen.getByRole('button', { name: /Liste/ }))
    expect(onList).toHaveBeenCalled()
  })
})
