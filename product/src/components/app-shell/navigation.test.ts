import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NAVIGATION_GROUPS,
  PRIMARY_NAVIGATION,
  SECONDARY_NAVIGATION_GROUPS,
  WORK_NAVIGATION_KEYS,
  navigationGroupItems,
  navigationItem,
  workNavigationItems,
} from './navigation'
import {
  resolveLessonMaterialsEntrypoint,
  type LessonMaterialsContext,
} from './lesson-materials-entrypoint'

test('canonical navigation has unique keys and routes', () => {
  const keys = PRIMARY_NAVIGATION.map((item) => item.key)
  const hrefs = PRIMARY_NAVIGATION.map((item) => item.href)

  assert.equal(new Set(keys).size, keys.length)
  assert.equal(new Set(hrefs).size, hrefs.length)
})

test('canonical navigation preserves every teacher capability', () => {
  assert.deepEqual(
    PRIMARY_NAVIGATION.map((item) => item.key),
    ['home', 'today', 'design', 'knowledge', 'classes', 'timetable', 'calendar', 'annual-plan', 'settings', 'account'],
  )
})

test('canonical navigation groups cover every destination exactly once', () => {
  const groupedKeys = NAVIGATION_GROUPS.flatMap((group) => group.items)
  const primaryKeys = PRIMARY_NAVIGATION.map((item) => item.key)

  assert.equal(groupedKeys.length, primaryKeys.length)
  assert.equal(new Set(groupedKeys).size, groupedKeys.length)
  assert.deepEqual([...groupedKeys].sort(), [...primaryKeys].sort())
})

test('ordinary work navigation exposes three teacher tasks and not Home or Conoscenza', () => {
  assert.deepEqual(WORK_NAVIGATION_KEYS, ['today', 'classes', 'timetable'])
  assert.deepEqual(workNavigationItems().map((item) => item.shortLabel), ['Oggi', 'Classi', 'Orario'])
  assert.equal(WORK_NAVIGATION_KEYS.includes('home'), false)
  assert.equal(WORK_NAVIGATION_KEYS.includes('knowledge'), false)
})

test('secondary navigation preserves all non-primary capabilities without overlap', () => {
  const secondaryKeys = SECONDARY_NAVIGATION_GROUPS.flatMap((group) => group.items)
  const expectedSecondary = PRIMARY_NAVIGATION
    .map((item) => item.key)
    .filter((key) => !WORK_NAVIGATION_KEYS.includes(key))

  assert.deepEqual([...secondaryKeys].sort(), [...expectedSecondary].sort())
  assert.equal(new Set(secondaryKeys).size, secondaryKeys.length)
  assert.equal(secondaryKeys.some((key) => WORK_NAVIGATION_KEYS.includes(key)), false)
  assert.ok(secondaryKeys.includes('home'))
  assert.ok(secondaryKeys.includes('knowledge'))
  assert.ok(secondaryKeys.includes('settings'))
  assert.ok(secondaryKeys.includes('account'))
})

test('canonical navigation groups follow human tasks rather than technical containers', () => {
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[0]).map((item) => item.key), ['home', 'today'])
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[1]).map((item) => item.key), ['classes', 'design', 'annual-plan'])
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[2]).map((item) => item.key), ['timetable', 'calendar'])
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[3]).map((item) => item.key), ['knowledge'])
  assert.deepEqual(navigationGroupItems(NAVIGATION_GROUPS[4]).map((item) => item.key), ['settings', 'account'])
  assert.equal(NAVIGATION_GROUPS[1].label, 'Prepara e insegna')
  assert.equal(NAVIGATION_GROUPS[2].label, 'Tempo')
})

test('account and professional settings stay distinct and secondary', () => {
  assert.equal(navigationItem('settings').href, '/impostazioni')
  assert.match(navigationItem('settings').description, /contesto professionale|istituto|cattedra/i)
  assert.equal(navigationItem('account').href, '/account')
  assert.match(navigationItem('account').description, /password|MFA|sessioni/i)
  assert.equal(WORK_NAVIGATION_KEYS.includes('settings'), false)
  assert.equal(WORK_NAVIGATION_KEYS.includes('account'), false)
})

test('Orario and Calendario stay distinct in labels and intent', () => {
  assert.equal(navigationItem('timetable').label, 'Orario')
  assert.match(navigationItem('timetable').description, /settimana|lezione/i)
  assert.equal(navigationItem('calendar').href, '/calendario')
  assert.match(navigationItem('calendar').description, /date|sospensioni|scadenze/i)
})

test('LP-4: Home e Oggi aprono la superficie canonica dei materiali', () => {
  const context = lessonMaterialsContext()

  assert.equal(resolveLessonMaterialsEntrypoint({ active: 'home', pathname: '/', context })?.href, '/materiali/prossima')
  assert.equal(resolveLessonMaterialsEntrypoint({ active: 'today', pathname: '/planner', context })?.href, '/materiali/prossima')
})

test('LP-4: Classe mostra i materiali solo per la sezione autorevole', () => {
  const context = lessonMaterialsContext()
  const matching = resolveLessonMaterialsEntrypoint({ active: 'classes', pathname: '/classi/section-2c', context })

  assert.equal(matching?.sectionLabel, '2ª C')
  assert.equal(matching?.timeLabel, '15:00–16:00')
  assert.equal(resolveLessonMaterialsEntrypoint({ active: 'classes', pathname: '/classi/section-1a', context }), null)
  assert.equal(resolveLessonMaterialsEntrypoint({ active: 'classes', pathname: '/classi', context }), null)
  assert.equal(resolveLessonMaterialsEntrypoint({ active: 'classes', pathname: '/classi/section-2c/lezioni/B03', context }), null)
})

test('LP-4: un contesto non risolto non espone un collegamento ai materiali', () => {
  assert.equal(resolveLessonMaterialsEntrypoint({
    active: 'today',
    pathname: '/planner',
    context: { nextLessonPreparation: null },
  }), null)

  const context = lessonMaterialsContext()
  context.nextLessonPreparation!.canonicalLesson = null
  assert.equal(resolveLessonMaterialsEntrypoint({ active: 'home', pathname: '/', context }), null)
})

test('LP-4: l’orario provvisorio resta dichiarato come provvisorio', () => {
  const result = resolveLessonMaterialsEntrypoint({
    active: 'today',
    pathname: '/planner',
    context: lessonMaterialsContext('PROVISIONAL_DRAFT'),
  })

  assert.equal(result?.authorityLabel, 'ORARIO PROVVISORIO')
})

function lessonMaterialsContext(authority: 'IN_FORCE' | 'PROVISIONAL_DRAFT' = 'IN_FORCE'): LessonMaterialsContext {
  return {
    nextLessonPreparation: {
      lesson: {
        sectionId: 'section-2c',
        disciplineId: 'technology',
        startAt: '2026-09-15T15:00:00',
        endAt: '2026-09-15T16:00:00',
        authority,
      },
      canonicalLesson: {
        sectionLabel: '2ª C',
        title: 'Misurare con precisione',
      },
    },
  }
}
