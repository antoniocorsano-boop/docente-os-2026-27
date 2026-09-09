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

test('canonical navigation exposes teacher destinations without a duplicate Home dashboard', () => {
  assert.deepEqual(
    PRIMARY_NAVIGATION.map((item) => item.key),
    ['today', 'design', 'knowledge', 'classes', 'timetable', 'calendar', 'annual-plan', 'settings'],
  )
  assert.equal(PRIMARY_NAVIGATION.some((item) => item.key === 'home'), false)
})

test('navigation groups cover every destination exactly once', () => {
  const groupedKeys = NAVIGATION_GROUPS.flatMap((group) => group.items)
  const primaryKeys = PRIMARY_NAVIGATION.map((item) => item.key)

  assert.equal(groupedKeys.length, primaryKeys.length)
  assert.equal(new Set(groupedKeys).size, groupedKeys.length)
  assert.deepEqual([...groupedKeys].sort(), [...primaryKeys].sort())
})

test('navigation groups follow daily teacher tasks rather than technical containers', () => {
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[0]).map((item) => item.key), ['today'])
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[1]).map((item) => item.key), ['classes', 'design', 'annual-plan'])
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[2]).map((item) => item.key), ['timetable', 'calendar'])
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[3]).map((item) => item.key), ['knowledge'])
  assert.equal(NAVIGATION_GROUPS[0].label, 'Adesso')
  assert.equal(NAVIGATION_GROUPS[1].label, 'Prepara e insegna')
  assert.equal(NAVIGATION_GROUPS[2].label, 'Tempo')
})

test('Oggi is the primary operational destination', () => {
  assert.equal(PRIMARY_NAVIGATION[0].key, 'today')
  assert.match(navigationItem('today').description, /impegni|lezioni|giornata/i)
})

test('Orario and Calendario stay distinct in labels and intent', () => {
  assert.equal(navigationItem('timetable').label, 'Orario')
  assert.match(navigationItem('timetable').description, /settimana|lezioni/i)
  assert.equal(navigationItem('calendar').href, '/calendario')
  assert.match(navigationItem('calendar').description, /date|sospensioni|scadenze/i)
})
