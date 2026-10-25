import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

async function source() {
  return readFile(new URL('./today-context-loader.ts', import.meta.url), 'utf8')
}

async function timetableSource() {
  return readFile(new URL('../../orario/TimetableExperience.tsx', import.meta.url), 'utf8')
}

async function plannerSource() {
  return readFile(new URL('../../planner/page.tsx', import.meta.url), 'utf8')
}

test('Today exposes one operational loader and Copilot delegates to it', async () => {
  const text = await source()
  assert.match(text, /export type LoadedTodayOperationalContext = \{/)
  assert.match(
    text,
    /export async function loadCurrentTodayOperationalContext\([\s\S]*options: \{ includePreparation\?: boolean \} = \{\}[\s\S]*\): Promise<LoadedTodayOperationalContext \| null>/,
  )
  assert.match(
    text,
    /export async function loadCurrentTodayCopilotContext\(\)[\s\S]*loadCurrentTodayOperationalContext\(\)/,
  )
})

test('Today operational loading keeps optional lesson preparation fail-soft', async () => {
  const text = await source()
  assert.match(text, /let preparation: LoadedNextLessonPreparation \| null = null/)
  assert.match(text, /if \(options\.includePreparation !== false\) \{[\s\S]*try \{[\s\S]*loadNextLessonPreparationBundle\(/)
  assert.match(text, /catch \{[\s\S]*Lesson preparation unavailable/)
  assert.match(text, /preparation,\n\s*\}/)
})

test('Today page uses a minimal lesson-binding fast path and never loads full preparation bundles', async () => {
  const text = await plannerSource()
  assert.match(text, /loadCurrentTodayOperationalContext\(\{ includePreparation: false \}\)/)
  assert.match(text, /loadTodayLessonBindings\(\{/)
  assert.doesNotMatch(text, /loadLessonPreparationBundlesForLessons/)
})

test('Today operational context exists without an academic year', async () => {
  const text = await source()
  assert.match(
    text,
    /if \(!workspaceContext\.academicYear\) \{[\s\S]*projectedDay: null,[\s\S]*homeDaily: emptyDailyContext\(clock\.localDate\),[\s\S]*preparation: null/,
  )
})

test('Today resolves the nearest future lesson with a bounded lookahead when today has no preparation', async () => {
  const text = await source()
  assert.match(text, /const NEXT_LESSON_LOOKAHEAD_DAYS = 7/)
  assert.match(text, /if \(!preparation\) \{[\s\S]*loadNearestUpcomingPreparation\(/)
  assert.match(text, /for \(let offset = 1; offset <= NEXT_LESSON_LOOKAHEAD_DAYS; offset \+= 1\)/)
  assert.match(text, /const futureDate = addLocalDays\(input\.localDate, offset\)/)
  assert.match(text, /projectTemporalDay\(\{[\s\S]*localDate: futureDate[\s\S]*timetableVersions: input\.timetable\.versions[\s\S]*calendarDays: input\.calendar\.days/)
  assert.match(text, /resolveHomeDailyContext\(\{[\s\S]*localDate: futureDate[\s\S]*minuteOfDay: 0[\s\S]*sessions: \[\]/)
  assert.match(text, /loadNextLessonPreparationBundle\(\{[\s\S]*homeDaily: futureDaily[\s\S]*minuteOfDay: 0/)
})

test('Future next-lesson lookup fails closed on ambiguous temporal authority', async () => {
  const text = await source()
  assert.match(text, /if \(futureDaily\.authority === 'AMBIGUOUS'\) return null/)
})

test('Today and Orario delegate current domain time to one shared scoped clock', async () => {
  const [today, timetable] = await Promise.all([source(), timetableSource()])

  assert.match(today, /import \{ currentRomeDomainClock \} from '@\/core\/application\/domain-clock'/)
  assert.match(today, /const clock = currentRomeDomainClock\(\)/)
  assert.doesNotMatch(today, /function currentRomeClock\(/)

  assert.match(timetable, /import \{ currentRomeDomainClock \} from '@\/core\/application\/domain-clock'/)
  assert.match(timetable, /currentRomeDomainClock\(\)/)
  assert.doesNotMatch(timetable, /function currentRomeMoment\(/)
  assert.doesNotMatch(timetable, /function currentRomeDate\(/)
})
