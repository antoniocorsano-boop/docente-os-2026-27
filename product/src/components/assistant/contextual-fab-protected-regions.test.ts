import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createProtectedRegionObservation,
  type ProtectedRegionRoot,
  type ResizeObserverLike,
} from './contextual-fab-protected-regions'

type FakeElement = { id: string }

test('late protected-region insertion removal and resize refresh the observed set and geometry', () => {
  const trigger: FakeElement = { id: 'fab' }
  const bottomNav: FakeElement = { id: 'bottom-nav' }
  const firstProtected: FakeElement = { id: 'first' }
  const lateProtected: FakeElement = { id: 'late' }
  let protectedRegions: FakeElement[] = [firstProtected]
  const observed: string[][] = []
  let geometryChanges = 0
  let mutationCallback: (() => void) | null = null

  const root: ProtectedRegionRoot<FakeElement> = {
    queryProtectedRegions: () => protectedRegions,
    queryBottomNavigation: () => bottomNav,
  }

  const resizeObserver: ResizeObserverLike<FakeElement> = {
    disconnect() {
      observed.push([])
    },
    observe(element) {
      const current = observed.at(-1)
      if (!current) throw new Error('observe called before disconnect')
      current.push(element.id)
    },
  }

  const cleanup = createProtectedRegionObservation({
    root,
    trigger,
    resizeObserver,
    createMutationObserver(callback) {
      mutationCallback = callback
      return {
        observe(target, options) {
          assert.equal(target, root)
          assert.deepEqual(options, { childList: true, subtree: true })
        },
        disconnect() {},
      }
    },
    onGeometryChange() {
      geometryChanges += 1
    },
  })

  assert.deepEqual(observed.at(-1), ['fab', 'first', 'bottom-nav'])

  protectedRegions = [firstProtected, lateProtected]
  mutationCallback?.()
  assert.deepEqual(observed.at(-1), ['fab', 'first', 'late', 'bottom-nav'])
  assert.equal(geometryChanges, 1)

  protectedRegions = [lateProtected]
  mutationCallback?.()
  assert.deepEqual(observed.at(-1), ['fab', 'late', 'bottom-nav'])
  assert.equal(geometryChanges, 2)

  // A resize of an already observed region is delivered by the ResizeObserver;
  // the lifecycle keeps that region registered after DOM mutations.
  assert.ok(observed.at(-1)?.includes('late'))

  cleanup()
})
