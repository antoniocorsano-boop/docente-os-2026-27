import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { classifyIntersection, intersection, rectFor } from './android-geometry.mjs'

const JOURNEY_ID = 'AR-02'
const STORAGE_KEY = 'DOCENTE_OS_CONTEXTUAL_FAB_PLACEMENT_V1'
const OUTPUT_ROOT = path.resolve('test-results/android-reality')
const SCREENSHOTS_DIR = path.join(OUTPUT_ROOT, 'screenshots')
const GEOMETRY_DIR = path.join(OUTPUT_ROOT, 'geometry')
const NATIVE_INPUT_TIMEOUT_MS = 10_000
const CALIBRATION_TAP_ATTEMPTS = 3
const CALIBRATION_SAMPLE_TIMEOUT_MS = 2_000

export async function runAr02FabTouchDrag(page, device) {
  await mkdir(SCREENSHOTS_DIR, { recursive: true })
  await mkdir(GEOMETRY_DIR, { recursive: true })

  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY)
  await page.goto('/planner', { waitUntil: 'domcontentloaded', timeout: 30_000 })

  const trigger = page.locator('.dosAssistantFloatingTrigger')
  await waitForVisible(trigger, 'AR-02 contextual FAB is not visible on Oggi')
  await waitForFabReady(page)
  await waitForAttribute(trigger, 'data-fab-mode', 'auto', 'AR-02 must start from AUTO placement')

  const before = await rectFor(trigger)
  if (!before) throw new Error('AR-02 contextual FAB has no measurable rectangle before native drag')

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'ar-02-before-native-drag.png'),
    fullPage: true,
  })

  const calibration = await calibrateNativeInput(page, device)
  const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const startCss = {
    x: before.left + before.width / 2,
    y: before.top + before.height / 2,
  }
  const targetCss = {
    x: startCss.x > viewport.width / 2 ? 30 : viewport.width - 30,
    y: Math.min(viewport.height - 150, Math.max(150, startCss.y)),
  }
  const startNative = cssToNative(startCss, calibration)
  const targetNative = cssToNative(targetCss, calibration)

  await installPointerTrace(page)
  await runNativeShellInput(
    device,
    `input swipe ${startNative.x} ${startNative.y} ${targetNative.x} ${targetNative.y} 350`,
    'AR-02 native Android swipe did not complete within the bounded timeout',
  )
  await page.waitForTimeout(600)

  const trace = await readPointerTrace(page)
  const mode = await trigger.getAttribute('data-fab-mode')
  const edge = await trigger.getAttribute('data-fab-edge')
  const panelOpen = await page.getByRole('button', { name: 'Chiudi' }).isVisible().catch(() => false)
  const persistedRaw = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
  const persisted = parseStoredPlacement(persistedRaw)
  const failures = []

  if (!trace.some((entry) => entry.type === 'pointerdown' && entry.pointerType === 'touch')) {
    failures.push({
      journey: JOURNEY_ID,
      code: 'FAB_NATIVE_TOUCH_EVENT_NOT_OBSERVED',
      message: 'The Android OS-level swipe did not reach Chrome as a touch pointer event',
    })
  }
  if (trace.some((entry) => entry.type === 'pointercancel')) {
    failures.push({
      journey: JOURNEY_ID,
      code: 'FAB_NATIVE_TOUCH_POINTER_CANCELLED',
      message: 'Chrome Android cancelled the native FAB pointer gesture before a manual placement could complete',
    })
  }
  if (mode !== 'manual' || !/^(left|right)$/.test(edge ?? '')) {
    failures.push({
      journey: JOURNEY_ID,
      code: 'FAB_NATIVE_TOUCH_DRAG_NOT_COMPLETED',
      message: `Native Android drag did not produce a manual semantic placement (mode=${mode ?? 'null'}, edge=${edge ?? 'null'})`,
    })
  }
  if (!isValidSemanticPlacement(persisted, edge)) {
    failures.push({
      journey: JOURNEY_ID,
      code: 'FAB_NATIVE_TOUCH_PREFERENCE_NOT_PERSISTED',
      message: 'Native Android drag did not persist the expected semantic edge/yRatio preference',
    })
  }
  if (panelOpen) {
    failures.push({
      journey: JOURNEY_ID,
      code: 'FAB_NATIVE_TOUCH_DRAG_OPENED_ASSISTANT',
      message: 'Native Android drag was misinterpreted as a tap and opened the assistant',
    })
  }

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'ar-02-after-native-drag.png'),
    fullPage: true,
  })

  const geometry = []
  let restored = null
  let materialsGeometry = null

  if (failures.length === 0) {
    await page.reload({ waitUntil: 'domcontentloaded' })
    const restoredTrigger = page.locator('.dosAssistantFloatingTrigger')
    await waitForVisible(restoredTrigger, 'AR-02 contextual FAB is not visible after reload')
    await waitForFabReady(page)
    const restoredMode = await restoredTrigger.getAttribute('data-fab-mode')
    const restoredEdge = await restoredTrigger.getAttribute('data-fab-edge')
    restored = { mode: restoredMode, edge: restoredEdge }

    if (restoredMode !== 'manual' || restoredEdge !== edge) {
      failures.push({
        journey: JOURNEY_ID,
        code: 'FAB_NATIVE_TOUCH_PREFERENCE_NOT_RESTORED',
        message: `Semantic placement was not restored after reload (mode=${restoredMode ?? 'null'}, edge=${restoredEdge ?? 'null'})`,
      })
    }

    const materials = page.locator('[data-testid="lesson-materials-entrypoint"]')
    await waitForVisible(materials, 'AR-02 lesson materials entrypoint is not visible after reload')
    await settleAnimationFrames(page)
    const [fabRect, materialsRect] = await Promise.all([rectFor(restoredTrigger), rectFor(materials)])
    if (!fabRect || !materialsRect) throw new Error('AR-02 could not measure restored FAB/materials geometry')
    const overlap = intersection(fabRect, materialsRect)
    const classification = classifyIntersection(fabRect, materialsRect, { essential: true })
    materialsGeometry = { fabRect, materialsRect, overlapArea: overlap.area, classification }
    geometry.push({
      checkpoint: 'touch-preference-restored-with-materials',
      subject: 'contextual-copilot-fab',
      target: 'lesson-materials-entrypoint',
      classification,
      intersectionArea: overlap.area,
      subjectRect: fabRect,
      targetRect: materialsRect,
    })
    if (classification === 'BLOCKING') {
      failures.push({
        journey: JOURNEY_ID,
        code: 'FAB_MANUAL_PREFERENCE_BLOCKS_PROTECTED_ACTION',
        message: `Restored native-touch preference overlaps the protected lesson materials action by ${overlap.area} CSS px²`,
      })
    }
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'ar-02-after-reload.png'),
      fullPage: true,
    })
  }

  await writeFile(
    path.join(GEOMETRY_DIR, 'ar-02.json'),
    `${JSON.stringify({
      journey: JOURNEY_ID,
      inputMethod: 'android-shell-input',
      calibration,
      viewport,
      before,
      startCss,
      targetCss,
      startNative,
      targetNative,
      pointerTrace: trace,
      mode,
      edge,
      persisted,
      restored,
      materialsGeometry,
    }, null, 2)}\n`,
    'utf8',
  )

  return {
    outcome: failures.length ? 'FAIL_PRODUCT' : 'PASS',
    journey: {
      id: JOURNEY_ID,
      outcome: failures.length ? 'FAIL_PRODUCT' : 'PASS',
      checkpoint: failures.length ? 'native-touch-drag' : 'touch-preference-restored-with-materials',
    },
    geometry,
    failures,
  }
}

async function calibrateNativeInput(page, device) {
  const wmSize = (await withTimeout(
    device.shell('wm size'),
    NATIVE_INPUT_TIMEOUT_MS,
    'AR-02 could not read the Android display size within the bounded timeout',
  )).toString('utf8')
  const nativeSize = parseWmSize(wmSize)
  if (!nativeSize) throw new Error(`AR-02 could not parse Android display size: ${wmSize.trim()}`)

  await page.evaluate(() => {
    const previous = document.querySelector('#hva-native-touch-calibrator')
    previous?.remove()
    const samples = []
    Object.defineProperty(window, '__hvaNativeTouchSamples', {
      configurable: true,
      value: samples,
      writable: true,
    })
    const overlay = document.createElement('div')
    overlay.id = 'hva-native-touch-calibrator'
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      background: 'transparent',
      pointerEvents: 'auto',
      touchAction: 'none',
    })
    const record = (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.type === 'pointerdown') samples.push({ x: event.clientX, y: event.clientY, pointerType: event.pointerType })
    }
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      overlay.addEventListener(type, record, { capture: true })
    }
    document.body.append(overlay)
  })

  const nativePoints = [
    { x: Math.round(nativeSize.width * 0.25), y: Math.round(nativeSize.height * 0.55) },
    { x: Math.round(nativeSize.width * 0.75), y: Math.round(nativeSize.height * 0.55) },
    { x: Math.round(nativeSize.width * 0.50), y: Math.round(nativeSize.height * 0.78) },
  ]

  try {
    for (let index = 0; index < nativePoints.length; index += 1) {
      const point = nativePoints[index]
      let observed = false
      for (let attempt = 1; attempt <= CALIBRATION_TAP_ATTEMPTS; attempt += 1) {
        await runNativeShellInput(
          device,
          `input tap ${point.x} ${point.y}`,
          `AR-02 native calibration tap ${index + 1} attempt ${attempt} did not complete within the bounded timeout`,
        )
        try {
          await page.waitForFunction(
            (expected) => Array.isArray(window.__hvaNativeTouchSamples) && window.__hvaNativeTouchSamples.length >= expected,
            index + 1,
            { timeout: CALIBRATION_SAMPLE_TIMEOUT_MS },
          )
          observed = true
          break
        } catch {
          if (attempt < CALIBRATION_TAP_ATTEMPTS) await page.waitForTimeout(250)
        }
      }
      if (!observed) {
        const observedCount = await page.evaluate(() => (
          Array.isArray(window.__hvaNativeTouchSamples) ? window.__hvaNativeTouchSamples.length : 0
        ))
        throw new Error(
          `AR-02 native calibration tap ${index + 1} was not observed after ${CALIBRATION_TAP_ATTEMPTS} attempts (samples=${observedCount})`,
        )
      }
    }
    const cssPoints = await page.evaluate(() => window.__hvaNativeTouchSamples.slice(0, 3))
    if (!cssPoints.every((sample) => sample.pointerType === 'touch')) {
      throw new Error('AR-02 calibration did not observe native Android touch pointer events')
    }
    const scaleX = (nativePoints[1].x - nativePoints[0].x) / (cssPoints[1].x - cssPoints[0].x)
    const scaleY = (nativePoints[2].y - nativePoints[0].y) / (cssPoints[2].y - cssPoints[0].y)
    const offsetX = nativePoints[0].x - cssPoints[0].x * scaleX
    const offsetY = nativePoints[0].y - cssPoints[0].y * scaleY
    if (![scaleX, scaleY, offsetX, offsetY].every(Number.isFinite) || scaleX <= 0 || scaleY <= 0) {
      throw new Error('AR-02 native/CSS coordinate calibration produced an invalid transform')
    }
    return { nativeSize, nativePoints, cssPoints, scaleX, scaleY, offsetX, offsetY }
  } finally {
    await page.evaluate(() => {
      document.querySelector('#hva-native-touch-calibrator')?.remove()
      delete window.__hvaNativeTouchSamples
    })
  }
}

function parseWmSize(raw) {
  const matches = [...raw.matchAll(/(?:Physical|Override) size:\s*(\d+)x(\d+)/g)]
  const match = matches.at(-1)
  if (!match) return null
  return { width: Number(match[1]), height: Number(match[2]) }
}

function cssToNative(point, calibration) {
  return {
    x: Math.round(point.x * calibration.scaleX + calibration.offsetX),
    y: Math.round(point.y * calibration.scaleY + calibration.offsetY),
  }
}

async function runNativeShellInput(device, command, message) {
  return withTimeout(device.shell(command), NATIVE_INPUT_TIMEOUT_MS, message)
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

async function installPointerTrace(page) {
  await page.evaluate(() => {
    const trace = []
    Object.defineProperty(window, '__hvaFabPointerTrace', {
      configurable: true,
      value: trace,
      writable: true,
    })
    const record = (event) => {
      if (trace.length >= 120) return
      trace.push({
        type: event.type,
        pointerType: event.pointerType,
        x: event.clientX,
        y: event.clientY,
        targetClass: event.target instanceof Element ? event.target.className : '',
      })
    }
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      document.addEventListener(type, record, { capture: true })
    }
  })
}

async function readPointerTrace(page) {
  return page.evaluate(() => Array.isArray(window.__hvaFabPointerTrace) ? window.__hvaFabPointerTrace.slice() : [])
}

function parseStoredPlacement(raw) {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isValidSemanticPlacement(value, edge) {
  return Boolean(
    value
    && value.version === 1
    && value.mode === 'manual'
    && value.edge === edge
    && (value.edge === 'left' || value.edge === 'right')
    && typeof value.yRatio === 'number'
    && Number.isFinite(value.yRatio)
    && value.yRatio >= 0
    && value.yRatio <= 1
    && !('left' in value)
    && !('top' in value)
    && !('x' in value)
    && !('y' in value),
  )
}

async function waitForFabReady(page) {
  await page.waitForFunction(() => (
    document.querySelector('.dosAssistantFloatingTrigger')?.getAttribute('data-fab-ready') === 'true'
  ), undefined, { timeout: 15_000 })
}

async function waitForVisible(locator, message) {
  try {
    await locator.waitFor({ state: 'visible', timeout: 15_000 })
  } catch {
    throw new Error(message)
  }
}

async function waitForAttribute(locator, name, value, message) {
  try {
    await locator.waitFor({ state: 'visible', timeout: 15_000 })
    await locator.page().waitForFunction(
      ({ selector, name, value }) => document.querySelector(selector)?.getAttribute(name) === value,
      { selector: '.dosAssistantFloatingTrigger', name, value },
      { timeout: 15_000 },
    )
  } catch {
    throw new Error(message)
  }
}

async function settleAnimationFrames(page) {
  await page.evaluate(() => new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))
  }))
}
