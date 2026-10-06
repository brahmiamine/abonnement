import { expect, test } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'
import { navigate } from './support/app'
import { SCREENS } from './support/screens'

test.beforeEach(async ({ page }) => {
  await mockSupabase(page)
})

for (const screen of SCREENS) {
  test(`rester sur « ${screen.hash} » après actualisation`, async ({ page }) => {
    await page.goto(`./#/${screen.hash}`)
    await expect(page.getByRole('heading', { name: screen.heading, level: 1 })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: screen.heading, level: 1 })).toBeVisible()
    expect(page.url()).toContain(`#/${screen.hash}`)
  })
}

test('une adresse inconnue retombe sur l’accueil', async ({ page }) => {
  await page.goto('./#/nimporte-quoi')
  await expect(page.getByRole('heading', { name: 'Mes abonnements', level: 1 })).toBeVisible()
})

test('la navigation met à jour l’URL et le bouton précédent fonctionne', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Mes abonnements', level: 1 })).toBeVisible()
  await navigate(page, 'Abonnements')
  await expect(page).toHaveURL(/#\/subscriptions$/)
  await navigate(page, 'Dépenses')
  await expect(page).toHaveURL(/#\/expenses$/)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Tous les abonnements', level: 1 })).toBeVisible()
})

test('chaque changement de page repart en haut', async ({ page }) => {
  await page.goto('./#/subscriptions')
  await expect(page.getByRole('heading', { name: 'Tous les abonnements', level: 1 })).toBeVisible()
  // Garantit que la page est assez longue pour défiler, quel que soit l'écran.
  await page.addStyleTag({ content: '.main-content { padding-bottom: 2500px !important; }' })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await navigate(page, 'Réglages')
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await navigate(page, 'Accueil')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})

test('les fournisseurs se gèrent depuis une page dédiée accessible via les réglages', async ({ page }) => {
  await page.goto('./#/settings')
  await expect(page.getByRole('heading', { name: 'Fournisseurs', level: 3 })).toBeVisible()
  // Le catalogue n'est plus affiché directement dans les réglages
  await expect(page.getByPlaceholder('Rechercher un fournisseur…')).toHaveCount(0)

  await page.getByRole('button', { name: /Gérer/ }).click()
  await expect(page).toHaveURL(/#\/providers$/)
  await expect(page.getByRole('heading', { name: 'Fournisseurs', level: 1 })).toBeVisible()
  await expect(page.getByPlaceholder('Rechercher un fournisseur…')).toBeVisible()

  // L'onglet Réglages reste actif, et le bouton retour ramène aux réglages
  const tab = page.locator('.mobile-nav button.active:visible, .sidebar button.active:visible')
  await expect(tab).toHaveCount(1)
  await expect(tab).toContainText('Réglages')
  await page.getByRole('button', { name: /^\s*Réglages\s*$/ }).and(page.locator('.back-link')).click()
  await expect(page).toHaveURL(/#\/settings$/)
})
