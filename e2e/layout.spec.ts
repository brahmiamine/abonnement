import { expect, test } from '@playwright/test'
import { mockSupabase } from './support/mockSupabase'
import { openAddModal } from './support/app'
import { SCREENS, findOverflowing, pageScrollsHorizontally } from './support/screens'

test.beforeEach(async ({ page }) => {
  await mockSupabase(page)
})

for (const screen of SCREENS) {
  test(`« ${screen.hash} » : aucun scroll horizontal ni débordement`, async ({ page }, info) => {
    await page.goto(`./#/${screen.hash}`)
    await expect(page.getByRole('heading', { name: screen.heading, level: 1 })).toBeVisible()
    expect(await pageScrollsHorizontally(page)).toBe(false)
    expect(await findOverflowing(page)).toEqual([])
    await page.screenshot({ path: `e2e/screenshots/${info.project.name}-${screen.hash}.png`, fullPage: true })
  })
}

test('« subscriptions » : un nom très long reste dans sa carte', async ({ page }) => {
  await page.goto('./#/subscriptions')
  const card = page.locator('.subscription-card', { hasText: 'Un abonnement avec un nom' })
  await expect(card).toBeVisible()
  const viewport = page.viewportSize()!
  const box = (await card.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
})

test('la modale d’ajout ne déborde pas', async ({ page }, info) => {
  await page.goto('./#/subscriptions')
  await openAddModal(page)
  await expect(page.getByRole('dialog', { name: 'Abonnement' })).toBeVisible()
  expect(await pageScrollsHorizontally(page)).toBe(false)
  const box = (await page.getByRole('dialog').boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  await page.screenshot({ path: `e2e/screenshots/${info.project.name}-modal.png` })
})

test.describe('barre de navigation mobile', () => {
  test.beforeEach(({}, info) => {
    test.skip(!/mobile/.test(info.project.name), 'mobile uniquement')
  })

  for (const screen of SCREENS) {
    test(`reste collée en bas sur « ${screen.hash} » même après défilement`, async ({ page }) => {
      await page.goto(`./#/${screen.hash}`)
      await expect(page.getByRole('heading', { name: screen.heading, level: 1 })).toBeVisible()
      const nav = page.locator('.mobile-nav')
      const check = async () => {
        const box = (await nav.boundingBox())!
        const { width, height } = page.viewportSize()!
        expect(Math.round(box.y + box.height)).toBe(height)
        expect(Math.round(box.x)).toBe(0)
        expect(Math.round(box.width)).toBe(width)
      }
      await check()
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await check()
    })
  }

  test('le contenu n’est jamais masqué par la barre du bas', async ({ page }) => {
    await page.goto('./#/settings')
    await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const nav = (await page.locator('.mobile-nav').boundingBox())!
    const last = (await page.locator('.settings-card').last().boundingBox())!
    expect(last.y + last.height).toBeLessThanOrEqual(nav.y)
  })

  test('les cibles tactiles de la navigation font au moins 44px', async ({ page }) => {
    await page.goto('./')
    const buttons = page.locator('.mobile-nav button')
    for (let i = 0; i < (await buttons.count()); i++) {
      const box = (await buttons.nth(i).boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
    }
  })
})

test('desktop : la barre latérale remplace la navigation du bas', async ({ page }, info) => {
  test.skip(!/desktop/.test(info.project.name), 'desktop uniquement')
  await page.goto('./')
  await expect(page.locator('.sidebar')).toBeVisible()
  await expect(page.locator('.mobile-nav')).toBeHidden()
})
