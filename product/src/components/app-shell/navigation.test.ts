import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import '../../app/attivita/attivita-ia-contract.test'
import {
  MOBILE_NAVIGATION_KEYS,
  PRIMARY_NAVIGATION,
  SECONDARY_NAVIGATION_GROUPS,
  navigationGroupItems,
  navigationItem,
  workNavigationItems,
} from './navigation'
import {
  resolveLessonMaterialsEntrypoint,
  type LessonMaterialsContext,
} from './lesson-materials-entrypoint'

test('DOS-IA-RESET exposes exactly Oggi, Orario, Classi and Altro as primary destinations', () => {
  assert.deepEqual(PRIMARY_NAVIGATION.map((item) => item.key), ['today', 'timetable', 'classes', 'more'])
  assert.deepEqual(PRIMARY_NAVIGATION.map((item) => item.label), ['Oggi', 'Orario', 'Classi', 'Altro'])
  assert.deepEqual(MOBILE_NAVIGATION_KEYS, ['today', 'timetable', 'classes', 'more'])
  assert.deepEqual(workNavigationItems().map((item) => item.key), [...MOBILE_NAVIGATION_KEYS])
})

test('Altro contains the three approved scannable groups in exact order', () => {
  assert.deepEqual(SECONDARY_NAVIGATION_GROUPS.map((group) => group.label), [
    'Lavoro',
    'Risorse e organizzazione',
    'Sistema',
  ])
  assert.deepEqual(SECONDARY_NAVIGATION_GROUPS.map((group) => group.items), [
    ['activities', 'design', 'annual-plan'],
    ['knowledge', 'calendar', 'documentation'],
    ['settings', 'account'],
  ])
  const secondaryKeys = SECONDARY_NAVIGATION_GROUPS.flatMap((group) => group.items)
  assert.equal(new Set(secondaryKeys).size, secondaryKeys.length)
  assert.equal(secondaryKeys.some((key) => MOBILE_NAVIGATION_KEYS.includes(key)), false)
})

test('Altro groups resolve direct tool routes without nested category pages', () => {
  assert.deepEqual(navigationGroupItems(SECONDARY_NAVIGATION_GROUPS[0]).map((item) => item.href), ['/attivita', '/progetta', '/piano-annuale'])
  assert.deepEqual(navigationGroupItems(SECONDARY_NAVIGATION_GROUPS[1]).map((item) => item.href), ['/knowledge', '/calendario', '/documentazione'])
  assert.deepEqual(navigationGroupItems(SECONDARY_NAVIGATION_GROUPS[2]).map((item) => item.href), ['/impostazioni', '/account'])
})

test('primary navigation keeps unique keys and routes', () => {
  const keys = PRIMARY_NAVIGATION.map((item) => item.key)
  const hrefs = PRIMARY_NAVIGATION.map((item) => item.href)
  assert.equal(new Set(keys).size, keys.length)
  assert.equal(new Set(hrefs).size, hrefs.length)
})

test('Materiali e fonti, Calendario, settings and account stay semantically distinct', () => {
  assert.equal(navigationItem('knowledge').label, 'Materiali e fonti')
  assert.equal(navigationItem('knowledge').href, '/knowledge')
  assert.equal(navigationItem('calendar').href, '/calendario')
  assert.match(navigationItem('calendar').description, /date|sospensioni|scadenze/i)
  assert.equal(navigationItem('settings').href, '/impostazioni')
  assert.equal(navigationItem('account').href, '/account')
  assert.match(navigationItem('account').description, /password|MFA|sessioni/i)
})

test('DOS-IA-RESET derives mobile navigation columns from rendered children instead of a fixed count', () => {
  const appShellCss = readFileSync(new URL('../../app/app-shell.css', import.meta.url), 'utf8')
  const bottomNavRules = appShellCss.match(/\.dosBottomNav\{[^}]+\}/g) ?? []
  const mobileRule = bottomNavRules.find((rule) => /position:fixed/.test(rule)) ?? ''
  assert.match(mobileRule, /grid-auto-flow:column/)
  assert.match(mobileRule, /grid-auto-columns:minmax\(0,1fr\)/)
  assert.doesNotMatch(mobileRule, /grid-template-columns:repeat\(\d+/)
})

test('DOS-IA-RESET reserves mobile content space above the fixed bottom navigation', () => {
  const appShellCss = readFileSync(new URL('../../app/app-shell.css', import.meta.url), 'utf8')
  const mobileStart = appShellCss.indexOf('@media(max-width:719px)')
  const mobileEnd = appShellCss.indexOf('@media(max-width:380px)', mobileStart)
  assert.notEqual(mobileStart, -1)
  assert.notEqual(mobileEnd, -1)
  const mobileCss = appShellCss.slice(mobileStart, mobileEnd)
  assert.match(mobileCss, /\.dosMainColumn\{[^}]*--dos-bottom-nav-height:68px[^}]*\}/)
  assert.match(mobileCss, /\.dosContent\.workSurface\{[^}]*padding-bottom:calc\(var\(--dos-bottom-nav-height\) \+ env\(safe-area-inset-bottom\) \+ 16px\)[^}]*\}/)
  assert.match(mobileCss, /\.dosBottomNav\{[^}]*min-height:var\(--dos-bottom-nav-height\)[^}]*\}/)
})

test('LP-4: Oggi keeps the existing contextual materials entrypoint until lesson migration', () => {
  const context = lessonMaterialsContext()
  assert.equal(resolveLessonMaterialsEntrypoint({ active: 'today', pathname: '/planner', context })?.href, '/materiali/prossima')
})

test('LP-4: Classe shows materials only for the authoritative section', () => {
  const context = lessonMaterialsContext()
  const matching = resolveLessonMaterialsEntrypoint({ active: 'classes', pathname: '/classi/section-2c', context })
  assert.equal(matching?.sectionLabel, '2ª C')
  assert.equal(matching?.timeLabel, '15:00–16:00')
  assert.equal(resolveLessonMaterialsEntrypoint({ active: 'classes', pathname: '/classi/section-1a', context }), null)
  assert.equal(resolveLessonMaterialsEntrypoint({ active: 'classes', pathname: '/classi', context }), null)
  assert.equal(resolveLessonMaterialsEntrypoint({ active: 'classes', pathname: '/classi/section-2c/lezioni/B03', context }), null)
})

test('LP-4: unresolved Oggi context exposes no materials shortcut', () => {
  assert.equal(resolveLessonMaterialsEntrypoint({ active: 'today', pathname: '/planner', context: { nextLessonPreparation: null } }), null)
})

test('LP-4: provisional timetable authority remains explicit', () => {
  const result = resolveLessonMaterialsEntrypoint({ active: 'today', pathname: '/planner', context: lessonMaterialsContext('PROVISIONAL_DRAFT') })
  assert.equal(result?.authorityLabel, 'ORARIO PROVVISORIO')
})

test('Oggi greeting is hydration-safe and bound to the canonical operational hour', () => {
  const plannerSource = readFileSync(new URL('../../app/planner/page.tsx', import.meta.url), 'utf8')
  const profileSource = readFileSync(new URL('../local-user-profile/local-user-profile.tsx', import.meta.url), 'utf8')
  const greetingSource = profileSource.slice(
    profileSource.indexOf('export function LocalTeacherGreeting'),
    profileSource.indexOf('export function useLocalTeacherProfile'),
  )

  assert.match(plannerSource, /<LocalTeacherGreeting\s+hour=\{Math\.floor\(operational\.minuteOfDay\s*\/\s*60\)\}\s*\/>/)
  assert.match(greetingSource, /hour:\s*number/)
  assert.doesNotMatch(greetingSource, /new Date\(\)/)
})

test('HVA 320×800 measures Oggi only after the final surface is visible', () => {
  const source = readFileSync(new URL('../../../e2e/experience/product-ia-reset.spec.mjs', import.meta.url), 'utf8')
  const start = source.indexOf("test('DOS-IA-RESET responsive 320×800")
  const end = source.indexOf("test('DOS-IA-RESET responsive 390×844", start)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)

  const contract = source.slice(start, end)
  const navigation = contract.indexOf("await page.goto('/planner')")
  const readiness = contract.indexOf("await expect(page.locator('#dos-main-content')).toBeVisible()")
  const overflowCheck = contract.indexOf("await expectNoHorizontalOverflow(page, 'Oggi 320×800')")

  assert.notEqual(navigation, -1)
  assert.notEqual(readiness, -1)
  assert.notEqual(overflowCheck, -1)
  assert.ok(navigation < readiness, 'Oggi readiness must be checked after navigation')
  assert.ok(readiness < overflowCheck, 'Overflow must be measured only after Oggi is visible')
})

function lessonMaterialsContext(authority: 'IN_FORCE' | 'PROVISIONAL_DRAFT' = 'IN_FORCE'): LessonMaterialsContext {
  return {
    nextLessonPreparation: {
      lesson: { sectionId: 'section-2c', disciplineId: 'technology', startAt: '2026-09-15T15:00:00', endAt: '2026-09-15T16:00:00', authority },
      canonicalLesson: { sectionLabel: '2ª C', title: 'Misurare con precisione' },
    },
  }
}
