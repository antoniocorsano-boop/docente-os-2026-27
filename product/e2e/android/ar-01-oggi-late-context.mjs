import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loginE2E } from '../support/e2e-auth.mjs'
import { classifyIntersection, intersection, rectFor } from './android-geometry.mjs'

const JOURNEY_ID = 'AR-01'
const OUTPUT_ROOT = path.resolve('test-results/android-reality')
const SCREENSHOTS_DIR = path.join(OUTPUT_ROOT, 'screenshots')
const GEOMETRY_DIR = path.join(OUTPUT_ROOT, 'geometry')

export async function runAr01OggiLateContext(page) {
  await mkdir(SCREENSHOTS_DIR, { recursive: true })
  await mkdir(GEOMETRY_DIR, { recursive: true })

  const contextGate = deferred()
  const contextSeen = deferred()
  let contextRequestCount = 0

  await page.route('**/api/assistant/today-context', async (route) => {
    contextRequestCount += 1
    contextSeen.resolve()
    const response = await route.fetch()
    await contextGate.promise
    await route.fulfill({ response })
  })

  try {
    await loginE2E(page)
    await withTimeout(
      contextSeen.promise,
      10_000,
      'AR-01 did not observe the governed Today context request after authenticated planner readiness',
    )

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ar-01-before-context.png'),
      fullPage: true,
    })

    contextGate.resolve()

    const entrypoint = page.locator('[data-testid="lesson-materials-entrypoint"]')
    const trigger = page.locator('.dosAssistantFloatingTrigger')
    const materialsAction = page.getByRole('link', { name: 'Apri materiali' })
    const bottomNav = page.locator('.dosBottomNav')

    await waitForVisible(entrypoint, 'AR-01 governed Today context did not expose the lesson materials entrypoint')
    await waitForVisible(trigger, 'AR-01 contextual FAB did not become visible after Today context readiness')
    await page.waitForFunction(() => (
      document.querySelector('.dosAssistantFloatingTrigger')?.getAttribute('data-fab-ready') === 'true'
    ), undefined, { timeout: 15_000 })
    await waitForVisible(materialsAction, 'AR-01 lesson materials action is not visible')
    await waitForVisible(bottomNav, 'AR-01 bottom navigation is not visible')

    await settleAnimationFrames(page)

    const fabRect = await rectFor(trigger)
    if (!fabRect) throw new Error('AR-01 contextual FAB has no measurable rectangle')

    const targets = [
      ['lesson-materials-entrypoint', entrypoint],
      ['apri-materiali', materialsAction],
      ['bottom-navigation', bottomNav],
    ]

    const geometry = []
    const failures = []

    for (const [targetName, locator] of targets) {
      const targetRect = await rectFor(locator)
      if (!targetRect) throw new Error(`AR-01 target has no measurable rectangle: ${targetName}`)
      const overlap = intersection(fabRect, targetRect)
      const classification = classifyIntersection(fabRect, targetRect, { essential: true })
      geometry.push({
        checkpoint: 'oggi-late-context-ready',
        subject: 'contextual-copilot-fab',
        target: targetName,
        classification,
        intersectionArea: overlap.area,
        subjectRect: fabRect,
        targetRect,
      })
      if (classification === 'BLOCKING') {
        failures.push({
          journey: JOURNEY_ID,
          code: 'FAB_BLOCKS_ESSENTIAL_ACTION',
          message: `Contextual FAB overlaps ${targetName} by ${overlap.area} CSS px²`,
        })
      }
    }

    await writeFile(
      path.join(GEOMETRY_DIR, 'ar-01.json'),
      `${JSON.stringify({ journey: JOURNEY_ID, contextRequestCount, geometry }, null, 2)}\n`,
      'utf8',
    )
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ar-01-after-context.png'),
      fullPage: true,
    })

    return {
      outcome: failures.length ? 'FAIL_PRODUCT' : 'PASS',
      journey: {
        id: JOURNEY_ID,
        outcome: failures.length ? 'FAIL_PRODUCT' : 'PASS',
        checkpoint: 'oggi-late-context-ready',
      },
      geometry,
      failures,
    }
  } finally {
    contextGate.resolve()
    await page.unroute('**/api/assistant/today-context').catch(() => {})
  }
}

async function waitForVisible(locator, message) {
  try {
    await locator.waitFor({ state: 'visible', timeout: 15_000 })
  } catch {
    throw new Error(message)
  }
}

async function settleAnimationFrames(page) {
  await page.evaluate(() => new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))
  }))
}

function deferred() {
  let settled = false
  let resolvePromise
  const promise = new Promise((resolve) => {
    resolvePromise = resolve
  })
  return {
    promise,
    resolve() {
      if (settled) return
      settled = true
      resolvePromise()
    },
  }
}

async function withTimeout(promise, timeoutMs, message) {
  let timer
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
