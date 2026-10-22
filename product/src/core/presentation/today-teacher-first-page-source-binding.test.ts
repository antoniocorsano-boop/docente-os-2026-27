import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const plannerPage = new URL('../../app/planner/page.tsx', import.meta.url)
const acceptanceReport = new URL('../../../scripts/experience/acceptance-report.mjs', import.meta.url)
const todayJourney = new URL('../../../e2e/experience/today-teacher-first.spec.mjs', import.meta.url)
const hvaReceiptScope = new URL('../../../../.github/scripts/certification/hva-receipt-scope.mjs', import.meta.url)

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

test('mandatory Oggi browser evidence fails closed when the governed journey is not PASS', async () => {
  const [reportText, journeyText, scopeText] = await Promise.all([
    readFile(acceptanceReport, 'utf8'),
    readFile(todayJourney, 'utf8'),
    readFile(hvaReceiptScope, 'utf8'),
  ])

  assert.match(journeyText, /id:\s*'today-teacher-first'/)
  assert.match(journeyText, /status:\s*'NOT_APPLICABLE'/)
  assert.match(scopeText, /FULL_JOURNEY_IDS[\s\S]*'today-teacher-first'/)
  assert.match(scopeText, /today-teacher-first\.spec\.mjs[\s\S]*today-teacher-first/)
  assert.match(reportText, /mandatoryJourneyIds/)
  assert.match(reportText, /today-teacher-first/)
  assert.match(reportText, /item\.status\s*!==\s*'PASS'/)
  assert.match(reportText, /HVA-JOURNEY-UNVERIFIED/)
})
