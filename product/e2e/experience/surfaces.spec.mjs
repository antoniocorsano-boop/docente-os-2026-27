import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { createExperienceObserver, screenshotPath } from '../support/experience-observer.mjs'
import { EXPERIENCE_SURFACES } from './surfaces.mjs'

requireE2ECredentials()

test.describe('Human + Visual Acceptance — superfici principali', () => {
  for (const surface of EXPERIENCE_SURFACES) {
    test(`${surface.id}: struttura, runtime ed evidenza visuale`, async ({ page }, testInfo) => {
      await loginE2E(page)
      const observer = createExperienceObserver(page)
      const response = await page.goto(surface.path)
      if (!response) throw new Error(`No navigation response for ${surface.path}`)
      expect(response.status(), `${surface.id} returned HTTP ${response.status()}`).toBeLessThan(400)

      await expect(page.locator('.workSurface')).toBeVisible({ timeout: 30_000 })
      const heading = page.locator('h1').first()
      await expect(heading, `${surface.id} must expose one visible primary heading`).toBeVisible()
      await page.waitForTimeout(600)

      if (surface.id === 'knowledge') {
        const recent = page.locator('.recentKnowledge')
        const primaryRows = recent.locator('.knowledgeAssetListPrimary > .knowledgeAssetRow')
        expect(await primaryRows.count(), 'Conoscenza should expose at most eight recent items before disclosure').toBeLessThanOrEqual(8)
        const more = recent.locator('details.knowledgeRecentMore')
        if (await more.count()) await expect(more).not.toHaveAttribute('open', '')

        const textPanel = page.locator('[data-capture-mode-panel="text"]')
        const filePanel = page.locator('[data-capture-mode-panel="file"]')
        const textMode = page.getByRole('button', { name: /Incolla un testo/ })
        const fileMode = page.getByRole('button', { name: /Carica un file/ })

        if (testInfo.project.name.startsWith('mobile')) {
          await expect(textMode).toBeVisible()
          await expect(fileMode).toBeVisible()
          await expect(textMode).toHaveAttribute('aria-pressed', 'true')
          await expect(fileMode).toHaveAttribute('aria-pressed', 'false')
          await expect(textPanel).toBeVisible()
          await expect(filePanel).not.toBeVisible()
          await page.screenshot({
            path: await screenshotPath(testInfo.project.name, 'knowledge-capture-text'),
            fullPage: true,
          })

          await fileMode.click()
          await expect(textPanel).not.toBeVisible()
          await expect(filePanel).toBeVisible()
          await expect(fileMode).toHaveAttribute('aria-pressed', 'true')
          await page.screenshot({
            path: await screenshotPath(testInfo.project.name, 'knowledge-capture-file'),
            fullPage: true,
          })

          await textMode.click()
          await expect(textPanel).toBeVisible()
          await expect(filePanel).not.toBeVisible()
        } else {
          await expect(page.locator('.knowledgeCaptureModeSwitch')).not.toBeVisible()
          await expect(textPanel).toBeVisible()
          await expect(filePanel).toBeVisible()
        }
      }

      if (surface.id === 'settings' && testInfo.project.name.startsWith('mobile')) {
        await expect(page.locator('.settingsCard form:visible')).toHaveCount(0)
        await page.screenshot({
          path: await screenshotPath(testInfo.project.name, 'settings-compact'),
          fullPage: true,
        })
        const nextStep = page.locator('.settingsGuidance a[href^="#"]')
        if (await nextStep.count()) {
          await nextStep.click()
          await expect(page.locator('.settingsCard:target')).toBeVisible()
          expect(await page.locator('.settingsCard:target form:visible').count(), 'Selected settings area should expose its controls').toBeGreaterThan(0)
        }
      }

      if (surface.id === 'planner' && testInfo.project.name.startsWith('mobile')) {
        await assertMobileAssistantClearsBottomNavigation(page)
      }

      const observation = await observer.capture({
        surface: surface.id,
        label: surface.label,
        project: testInfo.project.name,
      })

      expect(observation.horizontalOverflow, `${surface.id} overflows viewport by ${observation.horizontalOverflow}px`).toBeLessThanOrEqual(1)
      expect(observation.consoleErrors, `${surface.id} emitted console errors`).toEqual([])
      expect(observation.pageErrors, `${surface.id} emitted page errors`).toEqual([])
      expect(observation.requestFailures, `${surface.id} has failed network requests`).toEqual([])
      expect(observation.httpErrors.filter((item) => item.status >= 500), `${surface.id} has 5xx responses`).toEqual([])

      await page.screenshot({
        path: await screenshotPath(testInfo.project.name, surface.id),
        fullPage: true,
      })
    })
  }
})

async function assertMobileAssistantClearsBottomNavigation(page) {
  const assistant = page.locator('.dosAssistantFloatingTrigger')
  await expect(
    assistant,
    'Il Planner mobile deve rendere disponibile l’assistente senza occupare la navigazione primaria.',
  ).toBeVisible({ timeout: 20_000 })

  await assistant.scrollIntoViewIfNeeded()
  const geometry = await page.evaluate(() => {
    const support = document.querySelector('.dosAssistantFloatingTrigger')
    const nav = document.querySelector('.dosBottomNav')
    if (!support || !nav) return null
    const supportRect = support.getBoundingClientRect()
    const navRect = nav.getBoundingClientRect()
    return {
      position: getComputedStyle(support).position,
      supportBottom: supportRect.bottom,
      navTop: navRect.top,
    }
  })

  expect(geometry, 'Impossibile misurare assistente e navigazione nel Planner mobile.').not.toBeNull()
  expect(geometry.position, 'L’assistente chiuso del Planner non deve essere fixed sul contenuto.').toBe('absolute')
  expect(
    geometry.supportBottom,
    'L’assistente del Planner deve terminare prima della navigazione mobile.',
  ).toBeLessThanOrEqual(geometry.navTop - 8)
}
