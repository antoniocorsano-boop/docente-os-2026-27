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
