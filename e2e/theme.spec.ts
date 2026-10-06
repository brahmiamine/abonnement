import { expect, test } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'

const themeOf = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.dataset.theme)

const toggle = async (page: import('@playwright/test').Page) => {
  await page.goto('./#/settings')
  await page.getByRole('heading', { name: 'Apparence' }).waitFor()
  await page.getByRole('button', { name: /Mode clair|Mode sombre/ }).click()
}

test('le thème sombre est appliqué par défaut', async ({ page }) => {
  await mockSupabase(page)
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Mes abonnements', level: 1 })).toBeVisible()
  expect(await themeOf(page)).toBe('dark')
})

test('le thème clair est conservé après rafraîchissement', async ({ page }) => {
  await mockSupabase(page)
  await toggle(page)
  await expect.poll(() => themeOf(page)).toBe('light')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible()
  expect(await themeOf(page)).toBe('light')
})

test('le thème est appliqué avant le rendu de React (pas de flash)', async ({ page }) => {
  await mockSupabase(page)
  await page.addInitScript(() => localStorage.setItem('subly-theme', 'light'))
  // On bloque l'API : seule la valeur locale peut expliquer le thème.
  await page.goto('./', { waitUntil: 'commit' })
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light')
})

test('le choix local prime sur une valeur distante obsolète', async ({ page }) => {
  await mockSupabase(page, { theme: 'dark' })
  await page.addInitScript(() => localStorage.setItem('subly-theme', 'light'))
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Mes abonnements', level: 1 })).toBeVisible()
  expect(await themeOf(page)).toBe('light')
})

test('le thème distant est utilisé sur un nouvel appareil', async ({ page }) => {
  await mockSupabase(page, { theme: 'light' })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Mes abonnements', level: 1 })).toBeVisible()
  // Le thème distant arrive avec les données, juste après le squelette de chargement.
  await expect.poll(() => themeOf(page)).toBe('light')
})

test('le thème est conservé sur toutes les pages', async ({ page }) => {
  await mockSupabase(page)
  await toggle(page)
  for (const hash of ['home', 'subscriptions', 'expenses', 'providers']) {
    await page.goto(`./#/${hash}`)
    await page.reload()
    await page.locator('h1').waitFor()
    expect(await themeOf(page)).toBe('light')
  }
})
