import { expect, test } from '@playwright/test'
import { USER, longName, mockSupabase } from './support/mockSupabase'
import { navigate, openAddModal } from './support/app'

test.describe('connexion', () => {
  test('affiche l’écran d’authentification quand on est déconnecté', async ({ page }) => {
    await mockSupabase(page, { signedIn: false })
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  })

  test('un mauvais mot de passe affiche une erreur', async ({ page }) => {
    await mockSupabase(page, { signedIn: false })
    await page.goto('./')
    await page.getByPlaceholder('nom@email.com').fill('a@b.fr')
    await page.locator('input[type=password]').fill('mauvais-mdp')
    await page.locator('.auth-submit').click()
    await expect(page.locator('.auth-message')).toBeVisible()
  })

  test('les écrans d’inscription et de mot de passe oublié restent dans l’écran', async ({ page }) => {
    await mockSupabase(page, { signedIn: false })
    await page.goto('./')
    const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

    await page.locator('.auth-switch').click()
    await expect(page.getByRole('heading', { name: 'Créer mon compte' })).toBeVisible()
    expect(await fits()).toBe(true)

    await page.locator('.auth-switch').click()
    await page.locator('.forgot-link').click()
    await expect(page.getByRole('heading', { name: 'Mot de passe oublié' })).toBeVisible()
    expect(await fits()).toBe(true)

    await page.locator('.auth-switch').click()
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
  })
})

test.describe('abonnements', () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page)
  })

  test('l’accueil affiche les indicateurs et les prochaines échéances', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.metric-card', { hasText: 'Dépenses mensuelles' })).toBeVisible()
    await expect(page.getByText('Prochaine échéance')).toBeVisible()
    await expect(page.locator('.renewal-item', { hasText: 'Netflix' })).toBeVisible()
  })

  test('recherche et filtres', async ({ page }) => {
    await page.goto('./#/subscriptions')
    await expect(page.locator('.subscription-card')).toHaveCount(5)
    await page.getByPlaceholder('Rechercher un abonnement…').fill('spot')
    await expect(page.locator('.subscription-card')).toHaveCount(1)
    await page.getByPlaceholder('Rechercher un abonnement…').fill('introuvable')
    await expect(page.locator('.subscription-card')).toHaveCount(0)
    await page.getByPlaceholder('Rechercher un abonnement…').fill('')
    await page.getByRole('button', { name: 'Essais' }).click()
    await expect(page.locator('.subscription-card')).toHaveCount(1)
    await page.getByRole('button', { name: '≤ 30 jours' }).click()
    await expect(page.locator('.subscription-card')).toHaveCount(3) // Netflix (3 j), Spotify (12 j), ChatGPT Plus (25 j)
  })

  test('créer, modifier puis supprimer un abonnement', async ({ page }) => {
    await page.goto('./#/subscriptions')
    await openAddModal(page)
    await page.getByPlaceholder('Netflix, Claude, RED by SFR…').fill('Service perso')
    await page.locator('.provider-results .custom-provider').click()
    await page.locator('input[type=number]').fill('9.5')
    await page.getByRole('dialog').getByRole('button', { name: 'Ajouter', exact: true }).click()
    const card = page.locator('.subscription-card', { hasText: 'Service perso' })
    await expect(card).toBeVisible()

    await card.getByRole('button', { name: 'Modifier' }).click()
    await page.locator('input[type=number]').fill('12')
    await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer' }).click()
    await expect(card).toContainText('12')

    page.once('dialog', (dialog) => void dialog.accept())
    await card.getByRole('button', { name: 'Supprimer' }).click()
    await expect(card).toHaveCount(0)
  })

  test('annuler la suppression conserve l’abonnement', async ({ page }) => {
    await page.goto('./#/subscriptions')
    page.once('dialog', (dialog) => void dialog.dismiss())
    await page.locator('.subscription-card', { hasText: 'Spotify' }).getByRole('button', { name: 'Supprimer' }).click()
    await expect(page.locator('.subscription-card', { hasText: 'Spotify' })).toBeVisible()
  })

  test('la modale se ferme avec le bouton Fermer', async ({ page }) => {
    await page.goto('./')
    await openAddModal(page)
    await page.getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('la page dépenses affiche les totaux et le plus gros abonnement', async ({ page }) => {
    await page.goto('./')
    await navigate(page, 'Dépenses')
    await expect(page.getByRole('heading', { name: 'Dépenses', level: 1 })).toBeVisible()
    await expect(page.getByText(longName).first()).toBeVisible()
  })

  test('les réglages : export, déconnexion et effacement', async ({ page }) => {
    await page.goto('./#/settings')
    await expect(page.getByText(USER.email)).toBeVisible()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: /Exporter/ }).click()
    expect((await download).suggestedFilename()).toMatch(/^subly-backup-\d{4}-\d{2}-\d{2}\.json$/)

    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: /Effacer/ }).click()
    await navigate(page, 'Abonnements')
    await expect(page.locator('.subscription-card')).toHaveCount(0)
  })

  test('une erreur de sauvegarde est signalée sans casser l’écran', async ({ page }) => {
    const backend = await mockSupabase(page)
    backend.failTable = 'subscriptions'
    await page.goto('./#/subscriptions')
    await openAddModal(page)
    await page.getByPlaceholder('Netflix, Claude, RED by SFR…').fill('Netflix')
    await page.locator('.provider-results button', { hasText: 'Netflix' }).first().click()
    await page.locator('input[type=number]').fill('5')
    await page.getByRole('dialog').getByRole('button', { name: 'Ajouter', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
