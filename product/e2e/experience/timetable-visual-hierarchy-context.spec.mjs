import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'

requireE2ECredentials()

const MOBILE_VIEWPORTS = [
  { width: 360, height: 800, label: 'mobile-compact' },
  { width: 390, height: 844, label: 'mobile-medium' },
  { width: 412, height: 915, label: 'mobile-pilot' },
  { width: 768, height: 1024, label: 'tablet-portrait' },
]

test('Orario Gestisci: gerarchia contestuale resta leggibile nello spazio disponibile', async ({ page }, testInfo) => {
  await loginE2E(page)

  const viewports = testInfo.project.name.startsWith('mobile')
    ? MOBILE_VIEWPORTS
    : [{ width: 1440, height: 1000, label: 'desktop' }]

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await page.goto('/orario/gestisci')

    const decision = page.locator('[data-visual-priority="decision-primary"]')
    const operational = page.locator('[data-visual-priority="operational-primary"]').first()

    await expect(decision, `${viewport.label}: deve esistere una sola decisione primaria percepibile.`).toHaveCount(1)
    await expect(decision).toBeVisible()
    await expect(operational).toBeVisible()

    const geometry = await page.evaluate(() => {
      const decision = document.querySelector('[data-visual-priority="decision-primary"]')
      const operational = document.querySelector('[data-visual-priority="operational-primary"]')
      if (!decision || !operational) return null
      const decisionRect = decision.getBoundingClientRect()
      const operationalRect = operational.getBoundingClientRect()
      return {
        decisionTop: decisionRect.top + window.scrollY,
        decisionBottomInViewport: decisionRect.bottom,
        operationalTop: operationalRect.top + window.scrollY,
        viewportHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }
    })

    expect(geometry, `${viewport.label}: impossibile misurare la gerarchia.`).not.toBeNull()
    expect(
      geometry.decisionTop,
      `${viewport.label}: la decisione primaria deve precedere il contenuto operativo.`,
    ).toBeLessThan(geometry.operationalTop)
    expect(
      geometry.decisionBottomInViewport,
      `${viewport.label}: la decisione primaria deve essere intercettabile nel primo viewport.`,
    ).toBeLessThanOrEqual(geometry.viewportHeight)
    expect(
      geometry.scrollWidth,
      `${viewport.label}: il percorso primario non deve introdurre overflow orizzontale.`,
    ).toBeLessThanOrEqual(geometry.clientWidth + 1)
  }
})
