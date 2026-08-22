import assert from 'node:assert/strict'
import test from 'node:test'
import { PRIMARY_NAVIGATION, navigationItem } from './navigation'

test('canonical navigation has unique keys and routes', () => {
  const keys = PRIMARY_NAVIGATION.map((item) => item.key)
  const hrefs = PRIMARY_NAVIGATION.map((item) => item.href)

  assert.equal(new Set(keys).size, keys.length)
  assert.equal(new Set(hrefs).size, hrefs.length)
})

test('canonical navigation exposes every primary teacher destination', () => {
  assert.deepEqual(
    PRIMARY_NAVIGATION.map((item) => item.key),
    ['home', 'today', 'design', 'knowledge', 'classes', 'timetable', 'annual-plan', 'settings'],
  )
})

test('navigation lookup is stable', () => {
  assert.equal(navigationItem('knowledge').href, '/knowledge')
  assert.equal(navigationItem('timetable').label, 'Orario')
})
