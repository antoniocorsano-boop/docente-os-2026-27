import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseContextualFabPreference,
  resolveContextualFabPlacement,
  snapContextualFabPreference,
  type ContextualFabPreference,
  type FabRect,
} from './contextual-fab-positioning'

const viewport: FabRect = { left: 0, top: 0, right: 390, bottom: 844 }
const fabSize = { width: 56, height: 56 }
const auto: ContextualFabPreference = { version: 1, mode: 'auto' }

function rect(left: number, top: number, right: number, bottom: number): FabRect {
  return { left, top, right, bottom }
}

function intersects(a: FabRect, b: FabRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function placementRect(placement: ReturnType<typeof resolveContextualFabPlacement>): FabRect | null {
  if (placement.layout === 'docked') return null
  return {
    left: placement.left,
    top: placement.top,
    right: placement.left + fabSize.width,
    bottom: placement.top + fabSize.height,
  }
}

test('AUTO chooses a valid right-edge floating placement when one exists', () => {
  const placement = resolveContextualFabPlacement({
    viewport,
    fabSize,
    protectedRects: [],
    preference: auto,
    gap: 12,
  })

  assert.equal(placement.layout, 'floating')
  if (placement.layout !== 'floating') return
  assert.equal(placement.edge, 'right')
  assert.equal(placement.displaced, false)
  assert.ok(placement.left >= viewport.left + 12)
  assert.ok(placement.left + fabSize.width <= viewport.right - 12)
  assert.ok(placement.top >= viewport.top + 12)
  assert.ok(placement.top + fabSize.height <= viewport.bottom - 12)
})

test('manual right preference resolves near its normalized vertical preference', () => {
  const placement = resolveContextualFabPlacement({
    viewport,
    fabSize,
    protectedRects: [],
    preference: { version: 1, mode: 'manual', edge: 'right', yRatio: 0.25 },
    gap: 12,
  })

  assert.equal(placement.layout, 'floating')
  if (placement.layout !== 'floating') return
  assert.equal(placement.edge, 'right')
  assert.ok(Math.abs((placement.top + fabSize.height / 2) / viewport.bottom - 0.25) < 0.08)
})

test('manual drag near the left side snaps to the left edge and stores normalized Y only', () => {
  assert.deepEqual(
    snapContextualFabPreference({ pointerX: 30, pointerY: 422, viewport }),
    { version: 1, mode: 'manual', edge: 'left', yRatio: 0.5 },
  )
})

test('collision temporarily displaces a manual preference without deleting it', () => {
  const protectedRect = rect(322, 170, 390, 390)
  const preference: ContextualFabPreference = { version: 1, mode: 'manual', edge: 'right', yRatio: 0.3 }
  const placement = resolveContextualFabPlacement({
    viewport,
    fabSize,
    protectedRects: [protectedRect],
    preference,
    gap: 12,
  })

  assert.equal(placement.layout, 'floating')
  if (placement.layout !== 'floating') return
  assert.equal(placement.edge, 'right')
  assert.equal(placement.displaced, true)
  const resolvedRect = placementRect(placement)
  assert.ok(resolvedRect)
  assert.equal(intersects(resolvedRect, protectedRect), false)
  assert.deepEqual(preference, { version: 1, mode: 'manual', edge: 'right', yRatio: 0.3 })
})

test('no safe floating slot returns docked', () => {
  const placement = resolveContextualFabPlacement({
    viewport: rect(0, 0, 320, 800),
    fabSize,
    protectedRects: [rect(0, 0, 320, 800)],
    preference: auto,
    gap: 12,
  })

  assert.deepEqual(placement, { layout: 'docked', displaced: false })
})

test('bottom navigation and reduced visual viewport are excluded from placement', () => {
  const visualViewport = rect(0, 0, 390, 620)
  const bottomNavigation = rect(0, 552, 390, 620)
  const placement = resolveContextualFabPlacement({
    viewport: visualViewport,
    fabSize,
    protectedRects: [bottomNavigation],
    preference: auto,
    gap: 12,
  })

  assert.equal(placement.layout, 'floating')
  if (placement.layout !== 'floating') return
  const resolvedRect = placementRect(placement)
  assert.ok(resolvedRect)
  assert.ok(resolvedRect.bottom <= visualViewport.bottom - 12)
  assert.equal(intersects(resolvedRect, bottomNavigation), false)
})

test('dense protected content on 320x800 fails closed to docked', () => {
  const denseViewport = rect(0, 0, 320, 800)
  const placement = resolveContextualFabPlacement({
    viewport: denseViewport,
    fabSize,
    protectedRects: [rect(0, 0, 320, 360), rect(0, 360, 320, 720), rect(0, 720, 320, 800)],
    preference: { version: 1, mode: 'manual', edge: 'left', yRatio: 0.7 },
    gap: 12,
  })

  assert.deepEqual(placement, { layout: 'docked', displaced: true })
})

test('corrupt or version-mismatched persisted preference fails closed to AUTO', () => {
  assert.deepEqual(parseContextualFabPreference(null), auto)
  assert.deepEqual(parseContextualFabPreference('not-json'), auto)
  assert.deepEqual(parseContextualFabPreference('{"version":2,"mode":"manual","edge":"left","yRatio":0.4}'), auto)
  assert.deepEqual(parseContextualFabPreference('{"version":1,"mode":"manual","edge":"middle","yRatio":0.4}'), auto)
  assert.deepEqual(parseContextualFabPreference('{"version":1,"mode":"manual","edge":"right","yRatio":2}'), auto)
  assert.deepEqual(
    parseContextualFabPreference('{"version":1,"mode":"manual","edge":"right","yRatio":0.4}'),
    { version: 1, mode: 'manual', edge: 'right', yRatio: 0.4 },
  )
})
