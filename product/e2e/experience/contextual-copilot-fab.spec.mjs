import { expect, test } from '@playwright/test'
import { loginE2E, requireE2ECredentials } from '../support/e2e-auth.mjs'
import { experienceUdaFixtureTitle } from '../support/experience-uda-fixture.mjs'

requireE2ECredentials()

const STORAGE_KEY = 'DOCENTE_OS_CONTEXTUAL_FAB_PLACEMENT_V1'

test('Contextual Copilot FAB: manual drag snaps and persists semantic preference', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Manual FAB positioning is qualified on the mobile presentation contract.')

  await loginE2E(page)
  await page.goto('/progetta?grade=prima')

  const expectedTitle = experienceUdaFixtureTitle()
  const udaGroup = page.locator('.progettaGroup').filter({ hasText: /Unità di apprendimento|UDA/i }).first()
  await expect(udaGroup, 'Progetta must expose the governed UDA group.').toBeVisible()

  const resource = udaGroup.locator('.progettaItems a').filter({ hasText: expectedTitle }).first()
  await expect(resource, 'The governed HVA UDA must be reachable before qualifying the contextual FAB.').toBeVisible()
  await resource.click()

  await expect(page.locator('.focusedKnowledgeHero')).toBeVisible()
  await expect(page.locator('.focusedKnowledgeUse')).toBeVisible()

  const trigger = page.locator('.dosAssistantFloatingTrigger')
  await expect(trigger, 'The closed contextual Copilot trigger must be available on the UDA surface.').toBeVisible()
  await expect(trigger, 'The positioning adapter must explicitly publish hydration readiness.').toHaveAttribute('data-fab-ready', 'true')
  await expect(trigger).toHaveAttribute('data-fab-mode', 'auto')
  await expect(trigger).toHaveAttribute('data-fab-layout', /^(floating|docked)$/)

  const initialBox = await trigger.boundingBox()
  expect(initialBox, 'The contextual FAB must expose measurable geometry.').not.toBeNull()
  if (!initialBox) return

  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  if (!viewport) return

  const startX = initialBox.x + initialBox.width / 2
  const startY = initialBox.y + initialBox.height / 2
  const targetX = startX > viewport.width / 2 ? 28 : viewport.width - 28
  const targetY = Math.min(viewport.height - 140, Math.max(140, startY))

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(targetX, targetY, { steps: 8 })
  await page.mouse.up()

  await expect(trigger, 'A completed drag must switch the FAB to a manual semantic preference.').toHaveAttribute('data-fab-mode', 'manual')
  const snappedEdge = await trigger.getAttribute('data-fab-edge')
  expect(snappedEdge).toMatch(/^(left|right)$/)
  await expect(
    page.getByRole('status').filter({ hasText: 'Posizione manuale del copilota attiva' }),
    'Persisting the local FAB preference must have perceivable assistive feedback.',
  ).toBeAttached()

  const persisted = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
  expect(persisted, 'The device-local preference must be stored after a valid drag.').not.toBeNull()
  const parsed = JSON.parse(persisted)
  expect(parsed).toEqual(expect.objectContaining({
    version: 1,
    mode: 'manual',
    edge: snappedEdge,
  }))
  expect(typeof parsed.yRatio).toBe('number')
  expect(parsed.yRatio).toBeGreaterThanOrEqual(0)
  expect(parsed.yRatio).toBeLessThanOrEqual(1)
  expect(parsed).not.toHaveProperty('left')
  expect(parsed).not.toHaveProperty('top')
  expect(parsed).not.toHaveProperty('x')
  expect(parsed).not.toHaveProperty('y')

  await page.reload()
  const restoredTrigger = page.locator('.dosAssistantFloatingTrigger')
  await expect(restoredTrigger).toBeVisible()
  await expect(restoredTrigger).toHaveAttribute('data-fab-ready', 'true')
  await expect(restoredTrigger).toHaveAttribute('data-fab-mode', 'manual')
  await expect(restoredTrigger).toHaveAttribute('data-fab-edge', snappedEdge)

  await restoredTrigger.click()
  const reset = page.getByRole('button', { name: 'Ripristina posizione automatica' })
  await expect(reset, 'A stored manual preference must expose a keyboard-accessible reset to AUTO.').toBeVisible()
  await reset.click()
  await expect(reset).toHaveCount(0)
  await page.getByRole('button', { name: 'Chiudi' }).click()

  const automaticTrigger = page.locator('.dosAssistantFloatingTrigger')
  await expect(automaticTrigger).toHaveAttribute('data-fab-ready', 'true')
  await expect(automaticTrigger).toHaveAttribute('data-fab-mode', 'auto')
  await expect(
    page.getByRole('status').filter({ hasText: 'Posizione automatica del copilota attiva' }),
  ).toBeAttached()
  expect(await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)).toBeNull()

  await page.reload()
  await expect(page.locator('.dosAssistantFloatingTrigger')).toHaveAttribute('data-fab-mode', 'auto')
})

test('Contextual Copilot FAB: late protected-region mount removal and resize re-resolve without external geometry events', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'), 'Dynamic protected-region qualification is mobile-first.')

  await loginE2E(page)
  await page.goto('/progetta?grade=prima')

  const expectedTitle = experienceUdaFixtureTitle()
  const udaGroup = page.locator('.progettaGroup').filter({ hasText: /Unità di apprendimento|UDA/i }).first()
  await expect(udaGroup).toBeVisible()
  const resource = udaGroup.locator('.progettaItems a').filter({ hasText: expectedTitle }).first()
  await expect(resource).toBeVisible()
  await resource.click()

  const trigger = page.locator('.dosAssistantFloatingTrigger')
  await expect(trigger).toBeVisible()
  await expect(trigger).toHaveAttribute('data-fab-ready', 'true')
  await expect(trigger).toHaveAttribute('data-fab-layout', 'floating')

  await page.evaluate(() => {
    const region = document.createElement('div')
    region.id = 'hva-late-protected-region'
    region.setAttribute('data-copilot-protected', 'true')
    Object.assign(region.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '1',
    })
    document.body.append(region)
  })

  await expect(
    trigger,
    'A protected region mounted after FAB readiness must be discovered without resize, scroll or reload.',
  ).toHaveAttribute('data-fab-layout', 'docked')

  await page.evaluate(() => document.querySelector('#hva-late-protected-region')?.remove())
  await expect(
    trigger,
    'Removing the late protected region must release the floating layout without remounting the FAB.',
  ).toHaveAttribute('data-fab-layout', 'floating')

  await page.evaluate(() => {
    const region = document.createElement('div')
    region.id = 'hva-resizable-protected-region'
    region.setAttribute('data-copilot-protected', 'true')
    Object.assign(region.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: '1px',
      height: '1px',
      pointerEvents: 'none',
      zIndex: '1',
    })
    document.body.append(region)
  })

  const beforeResize = await trigger.boundingBox()
  expect(beforeResize).not.toBeNull()
  if (!beforeResize) return

  await page.evaluate((box) => {
    const region = document.querySelector('#hva-resizable-protected-region')
    if (!(region instanceof HTMLElement)) throw new Error('Resizable protected region missing')
    Object.assign(region.style, {
      left: `${box.x}px`,
      top: `${box.y}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    })
  }, beforeResize)

  await expect.poll(async () => {
    const [fabBox, regionBox] = await Promise.all([
      trigger.boundingBox(),
      page.locator('#hva-resizable-protected-region').boundingBox(),
    ])
    if (!fabBox || !regionBox) return Number.POSITIVE_INFINITY
    return intersectionArea(fabBox, regionBox)
  }, {
    message: 'A late protected region that resizes over the FAB must trigger a new safe placement.',
  }).toBe(0)

  await page.evaluate(() => document.querySelector('#hva-resizable-protected-region')?.remove())
})

function intersectionArea(a, b) {
  const left = Math.max(a.x, b.x)
  const top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  return Math.max(0, right - left) * Math.max(0, bottom - top)
}
