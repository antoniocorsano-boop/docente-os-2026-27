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
  assert.match(text, /buildTodayIAProjection/)
  assert.doesNotMatch(text, /SupabasePlannerRepository/)
  assert.doesNotMatch(text, /SupabaseTimetableProjectionReadRepository/)
  assert.doesNotMatch(text, /SupabaseCalendarProjectionReadRepository/)
  assert.doesNotMatch(text, /new TemporalProjectionService/)
})

test('Oggi renders immediate lesson work without restoring the generic timeline or planner detail', async () => {
  const text = await source()
  const lesson = text.indexOf('<TodayLessonCard')
  const commitments = text.indexOf('<section className="todayCalendarCommitments"')

  assert.ok(lesson >= 0, 'Oggi must render the immediate lesson card')
  assert.ok(commitments < 0 || lesson < commitments, 'immediate lesson work must precede compact Calendar commitments')
  assert.doesNotMatch(text, /<TodayTimeline/)
  assert.doesNotMatch(text, /<PlannerToday/)
})

test('Oggi keeps the existing AppShell and exposes Calendar as a secondary route', async () => {
  const text = await source()
  assert.match(text, /<AppShell[\s\S]*active="today"/)
  assert.match(text, /href="\/calendario"/)
  assert.doesNotMatch(text, /MOBILE_NAVIGATION_KEYS|NAVIGATION_GROUPS/)
})

test('Oggi excludes legacy generic quick actions and next-lesson material destinations', async () => {
  const text = await source()

  assert.doesNotMatch(text, /function TodayQuickActions/)
  assert.doesNotMatch(text, /Materiali della prossima lezione/)
  assert.doesNotMatch(text, /href="\/materiali\/prossima"/)
  assert.match(text, /href=\{item\.href\}/)
  assert.match(text, /fallbackActionLabel/)
})

test('Oggi explains a legitimate empty day and offers only the safe timetable continuation', async () => {
  const text = await source()

  assert.match(text, /className="todayEmptyState"/)
  assert.match(text, /Nessuna lezione o impegno da mostrare adesso/)
  assert.match(text, /href="\/orario"/)
  assert.doesNotMatch(text, /Aggiungi attività/)
})
