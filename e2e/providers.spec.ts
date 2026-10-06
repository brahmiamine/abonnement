import { expect, test } from '@playwright/test'
import { mockSupabase, type MockBackend } from './support/mockSupabase'
import { openAddModal } from './support/app'

const NEW_PROVIDERS = ['Free Mobile', 'Strong8K IPTV', 'Trex IPTV', 'King365 IPTV']

let backend: MockBackend
test.beforeEach(async ({ page }) => {
  backend = await mockSupabase(page)
})

test('Free Mobile, Strong8K, Trex et King365 IPTV sont ajoutés au catalogue', async ({ page }) => {
  await page.goto('./#/providers')
  await expect(page.getByRole('heading', { name: 'Fournisseurs', level: 1 })).toBeVisible()
  for (const name of NEW_PROVIDERS) {
    await expect(page.locator('.provider-admin-row', { hasText: name })).toBeVisible()
  }
  const saved = backend.tables.subscription_providers.map((row) => row.name)
  expect(saved).toEqual(expect.arrayContaining(NEW_PROVIDERS))
})

test('les nouveaux fournisseurs sont proposés dans la création d’un abonnement', async ({ page }) => {
  await page.goto('./#/subscriptions')
  await openAddModal(page)
  const input = page.getByPlaceholder('Netflix, Claude, RED by SFR…')
  for (const name of NEW_PROVIDERS) {
    await input.fill(name)
    await expect(page.locator('.provider-results button', { hasText: name }).first()).toBeVisible()
  }
})

test('on peut créer un abonnement Free Mobile', async ({ page }) => {
  await page.goto('./#/subscriptions')
  await openAddModal(page)
  await page.getByPlaceholder('Netflix, Claude, RED by SFR…').fill('Free Mobile')
  await page.locator('.provider-results button', { hasText: 'Free Mobile' }).first().click()
  await page.locator('input[type=number]').fill('19.99')
  await page.getByRole('dialog').getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.locator('.subscription-card', { hasText: 'Free Mobile' })).toBeVisible()
  expect(backend.tables.subscriptions.some((row) => row.name === 'Free Mobile')).toBe(true)
})

test('un fournisseur supprimé ne revient pas au rechargement', async ({ page }) => {
  await page.goto('./#/providers')
  const row = page.locator('.provider-admin-row', { hasText: 'Trex IPTV' })
  await expect(row).toBeVisible()
  page.once('dialog', (dialog) => void dialog.accept())
  await row.getByRole('button', { name: 'Supprimer Trex IPTV' }).click()
  await expect(row).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.provider-admin-row', { hasText: 'Free Mobile' })).toBeVisible()
  await expect(page.locator('.provider-admin-row', { hasText: 'Trex IPTV' })).toHaveCount(0)
})

test('on ne crée pas de doublon si le fournisseur existe déjà', async ({ page }) => {
  backend.tables.subscription_providers.push({
    user_id: 'user-1', id: 'custom-1', name: 'free mobile', category: 'Télécom', logo: '', website: '', color: '#111',
  })
  await page.goto('./#/providers')
  await expect(page.locator('.provider-admin-row', { hasText: 'Strong8K IPTV' })).toBeVisible()
  await expect(page.locator('.provider-admin-row', { hasText: /free mobile/i })).toHaveCount(1)
})

test('ajout, modification et recherche d’un fournisseur', async ({ page }) => {
  await page.goto('./#/providers')
  await page.locator('.provider-manager-header').getByRole('button', { name: /Ajouter/ }).click()
  await page.getByPlaceholder('Ex. RED by SFR Mobile').fill('Mon IPTV')
  await page.locator('.provider-editor').getByRole('button', { name: 'Enregistrer' }).click()
  const row = page.locator('.provider-admin-row', { hasText: 'Mon IPTV' })
  await expect(row).toBeVisible()

  await row.getByRole('button', { name: 'Modifier Mon IPTV' }).click()
  await page.getByPlaceholder('Ex. RED by SFR Mobile').fill('Mon IPTV 2')
  await page.locator('.provider-editor').getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.locator('.provider-admin-row', { hasText: 'Mon IPTV 2' })).toBeVisible()

  await page.getByPlaceholder('Rechercher un fournisseur…').fill('zzz')
  await expect(page.getByText('Aucun fournisseur trouvé.')).toBeVisible()
})
