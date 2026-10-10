import AxeBuilder from '@axe-core/playwright'
import { appendFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { openAddModal, settle } from './support/app'
import { mockSupabase } from './support/mockSupabase'
import { SCREENS } from './support/screens'

test.beforeEach(async ({ page }) => {
  await mockSupabase(page)
})

/** Violations graves (serious / critical) selon axe, thème sombre puis clair. */
const audit = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const result = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.slice(0, 6).map((node) => {
        const data = node.any[0]?.data as
          | {
              fgColor?: string
              bgColor?: string
              contrastRatio?: number
              expectedContrastRatio?: string
            }
          | undefined
        const detail = data?.fgColor
          ? ` [${data.fgColor} sur ${data.bgColor} = ${data.contrastRatio} (min ${data.expectedContrastRatio})]`
          : ''
        return `${node.target.join(' ')}${detail}`
      }),
    }))
  // Pour le diagnostic : A11Y_DUMP=/chemin/fichier.txt npx playwright test e2e/a11y.spec.ts
  if (process.env.A11Y_DUMP && result.length) {
    const theme = await page.evaluate(() => document.documentElement.dataset.theme)
    appendFileSync(process.env.A11Y_DUMP, `${page.url()} ${theme} ${JSON.stringify(result)}\n`)
  }
  return result
}

for (const screen of SCREENS) {
  for (const theme of ['dark', 'light'] as const) {
    test(`accessibilité « ${screen.hash} » (${theme})`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('subly-theme', value), theme)
      await page.goto(`./#/${screen.hash}`)
      await expect(page.getByRole('heading', { name: screen.heading, level: 1 })).toBeVisible()
      await settle(page)
      expect(await audit(page)).toEqual([])
    })
  }
}

test('accessibilité de la modale d’ajout', async ({ page }) => {
  await page.goto('./#/subscriptions')
  await openAddModal(page)
  await settle(page)
  expect(await audit(page)).toEqual([])
})

test('la modale se ferme avec Échap et rend le focus', async ({ page }) => {
  await page.goto('./#/subscriptions')
  const trigger = page.getByRole('button', { name: /Ajouter/ }).first()
  await trigger.focus()
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('le focus reste dans la modale avec Tab', async ({ page }) => {
  await page.goto('./#/subscriptions')
  await openAddModal(page)
  for (let i = 0; i < 30; i += 1) {
    await page.keyboard.press('Tab')
    const inside = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]')),
    )
    expect(inside).toBe(true)
  }
})
