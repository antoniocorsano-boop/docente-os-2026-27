import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const plannerPage = new URL('../../app/planner/page.tsx', import.meta.url)

async function source() {
  return readFile(plannerPage, 'utf8')
}

test('Oggi consumes the authoritative operational Today loader instead of rebuilding temporal authority', async () => {
  const text = await source()
  assert.match(text, /loadCurrentTodayOperationalContext/)
  assert.match(text, /buildTodayTeachingFocus/)
  assert.doesNotMatch(text, /SupabasePlannerRepository/)
  assert.doesNotMatch(text, /SupabaseTimetableProjectionReadRepository/)
  assert.doesNotMatch(text, /SupabaseCalendarProjectionReadRepository/)
  assert.doesNotMatch(text, /new TemporalProjectionService/)
})

test('teacher-first lesson focus is rendered before generic timeline and planner detail', async () => {
  const text = await source()
  const focus = text.indexOf('<TodayTeachingFocusCard')
  const timeline = text.indexOf('<TodayTimeline')
  const planner = text.indexOf('<PlannerToday')

  assert.ok(focus >= 0, 'Oggi must render TodayTeachingFocusCard')
  assert.ok(timeline < 0 || focus < timeline, 'teacher focus must precede the timeline')
  assert.ok(planner < 0 || focus < planner, 'teacher focus must precede planner detail')
})

test('Oggi keeps the existing AppShell and exposes Calendar as a secondary route', async () => {
  const text = await source()
  assert.match(text, /<AppShell[\s\S]*active="today"/)
  assert.match(text, /href="\/calendario"/)
  assert.doesNotMatch(text, /MOBILE_NAVIGATION_KEYS|NAVIGATION_GROUPS/)
})

test('teacher-first quick actions are scoped to the known class and existing next-lesson materials', async () => {
  const text = await source()
  const start = text.indexOf('function TodayQuickActions')
  const end = text.indexOf('function TodayFocusCard')
  assert.ok(start >= 0 && end > start, 'TodayQuickActions source block must exist')
  const quickActions = text.slice(start, end)

  assert.match(quickActions, /Apri la classe/)
  assert.match(quickActions, /\/classi\/\$\{encodeURIComponent\(sectionId\)\}/)
  assert.match(quickActions, /Materiali della prossima lezione/)
  assert.match(quickActions, /href="\/materiali\/prossima"/)
  assert.doesNotMatch(quickActions, /href="\/orario"/)
})
