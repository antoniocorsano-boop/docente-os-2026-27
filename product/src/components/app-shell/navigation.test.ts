import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NAVIGATION_GROUPS,
  PRIMARY_NAVIGATION,
  navigationGroupItems,
  navigationItem,
} from './navigation'

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

test('navigation groups cover every destination exactly once', () => {
  const groupedKeys = NAVIGATION_GROUPS.flatMap((group) => group.items)
  const primaryKeys = PRIMARY_NAVIGATION.map((item) => item.key)

  assert.equal(groupedKeys.length, primaryKeys.length)
  assert.equal(new Set(groupedKeys).size, groupedKeys.length)
  assert.deepEqual([...groupedKeys].sort(), [...primaryKeys].sort())
})

test('navigation groups follow human tasks rather than technical containers', () => {
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[0]).map((item) => item.key), ['home', 'today'])
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[1]).map((item) => item.key), ['classes', 'design', 'annual-plan'])
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[2]).map((item) => item.key), ['timetable'])
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[3]).map((item) => item.key), ['knowledge'])
  assert.equal(NAVIGATION_GROUPS[1].label, 'Prepara e insegna')
})

test('navigation lookup is stable and Orario is described as an operational weekly guide', () => {
  assert.equal(navigationItem('knowledge').href, '/knowledge')
  assert.equal(navigationItem('timetable').label, 'Orario')
  assert.match(navigationItem('timetable').description, /settimana|lezione/i)
})
