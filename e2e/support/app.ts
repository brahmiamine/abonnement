import type { Page } from '@playwright/test'

/** Sur mobile la navigation est en bas ; sur grand écran dans la barre latérale. */
/** Attend que l'application soit chargée (barre du haut rendue) avant de choisir la navigation. */
const isMobileLayout = async (page: Page) => {
  await page.locator('.topbar').waitFor()
  return page.locator('.mobile-nav').isVisible()
}

export const navigate = async (page: Page, label: 'Accueil' | 'Abonnements' | 'Dépenses' | 'Réglages') => {
  const mobile = await isMobileLayout(page)
  if (mobile) {
    await page.locator('.mobile-nav').getByRole('button', { name: label }).click()
    return
  }
  const sidebarLabel = label === 'Accueil' ? 'Vue d’ensemble' : label
  await page.locator('.sidebar').getByRole('button', { name: new RegExp(sidebarLabel) }).click()
}

export const openAddModal = async (page: Page) => {
  const mobile = await isMobileLayout(page)
  if (mobile) await page.locator('.mobile-add').click()
  else await page.locator('.topbar').getByRole('button', { name: /Ajouter/ }).click()
}
