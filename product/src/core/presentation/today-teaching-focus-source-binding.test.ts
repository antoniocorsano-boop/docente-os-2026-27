import assert from 'node:assert/strict'
import test from 'node:test'
import type { NextLessonPreparation } from './next-lesson-preparation'
import { buildTodayTeachingFocus } from './today-teaching-focus'

const DATE = '2026-10-17'
const FUTURE_DATE = '2026-10-18'

function preparation(overrides: Partial<NextLessonPreparation> = {}): NextLessonPreparation {
  return {
    lesson: {
      logicalId: 'lesson-2c',
      startAt: `${DATE}T14:00:00`,
      endAt: `${DATE}T15:00:00`,
      title: '2C · Tecnologia',
      sectionId: 'section-2c',
      disciplineId: 'technology',
      authority: 'IN_FORCE',
    },
    canonicalLesson: {
      sectionLabel: '2ª C',
      disciplineLabel: 'Tecnologia',
      blockId: 'B03',
      title: 'Misurare con precisione',
      objective: 'Misurare e rappresentare un oggetto con procedure controllabili.',
      durationMinutes: 60,
      udaTitle: 'Misurare e rappresentare',
      progressStatus: 'PIANIFICATO',
      preparationPreview: ['Righelli', 'Oggetto semplice da misurare'],
      remainingPreparationCount: 0,
      readyTitles: ['Scheda studente'],
      readyCount: 1,
      statusLabel: 'ENRICHED',
    },
    continuity: null,
    replanning: null,
    knowledgeResources: [],
    missingInformation: [],
    provenance: [],
    ...overrides,
  }
}

test('teacher-first focus exposes a direct canonical preparation action for the next lesson', () => {
  const focus = buildTodayTeachingFocus({ preparation: preparation(), localDate: DATE, minuteOfDay: 13 * 60 + 30 })

  assert.ok(focus)
  assert.equal(focus.state, 'NEXT')
  assert.equal(focus.stateLabel, 'Prossima lezione')
  assert.equal(focus.minutesUntilStart, 30)
  assert.equal(focus.dateLabel, null)
  assert.equal(focus.classLabel, '2ª C')
  assert.equal(focus.subjectLabel, 'Tecnologia')
  assert.equal(focus.lessonTitle, 'Misurare con precisione')
  assert.deepEqual(focus.action, {
    kind: 'PREPARE',
    label: 'Prepara lezione',
    href: '/classi/section-2c/lezioni/B03?mode=prepare',
  })
  assert.ok(focus.chips.length <= 3)
})

test('teacher-first focus marks an in-progress lesson explicitly', () => {
  const focus = buildTodayTeachingFocus({ preparation: preparation(), localDate: DATE, minuteOfDay: 14 * 60 + 20 })
  assert.ok(focus)
  assert.equal(focus.state, 'CURRENT')
  assert.equal(focus.stateLabel, 'Lezione in corso')
  assert.equal(focus.minutesUntilStart, 0)
  assert.equal(focus.dateLabel, null)
})

test('teacher-first focus keeps the next future-day lesson visible independently of todays clock time', () => {
  const base = preparation()
  const focus = buildTodayTeachingFocus({
    preparation: preparation({
      lesson: {
        ...base.lesson,
        startAt: `${FUTURE_DATE}T09:00:00`,
        endAt: `${FUTURE_DATE}T10:00:00`,
      },
    }),
    localDate: DATE,
    minuteOfDay: 18 * 60,
  })

  assert.ok(focus)
  assert.equal(focus.state, 'NEXT')
  assert.equal(focus.stateLabel, 'Prossima lezione')
  assert.equal(focus.minutesUntilStart, null)
  assert.equal(focus.dateLabel, 'Domani')
})

test('teacher-first focus rejects stale preparation from a previous date', () => {
  const base = preparation()
  const focus = buildTodayTeachingFocus({
    preparation: preparation({
      lesson: {
        ...base.lesson,
        startAt: '2026-10-16T14:00:00',
        endAt: '2026-10-16T15:00:00',
      },
    }),
    localDate: DATE,
    minuteOfDay: 9 * 60,
  })

  assert.equal(focus, null)
})

test('teacher-first focus fails closed to the class when the canonical lesson is unavailable', () => {
  const focus = buildTodayTeachingFocus({
    preparation: preparation({ canonicalLesson: null }),
    localDate: DATE,
    minuteOfDay: 13 * 60 + 30,
  })

  assert.ok(focus)
  assert.equal(focus.lessonTitle, '2C · Tecnologia')
  assert.deepEqual(focus.action, {
    kind: 'CLASS',
    label: 'Apri la classe',
    href: '/classi/section-2c',
  })
})

test('ambiguous canonical context keeps known lesson facts and states uncertainty in teacher language', () => {
  const focus = buildTodayTeachingFocus({
    preparation: preparation({
      canonicalLesson: null,
      missingInformation: ['Collegamento al blocco canonico non disponibile.'],
      continuity: {
        nextActivity: 'Riprendere la misura dell’oggetto e confrontare gli errori.',
        sourceSessionId: 'session-previous',
        sourceLocalDate: '2026-10-15',
      },
    }),
    localDate: DATE,
    minuteOfDay: 13 * 60 + 30,
  })

  assert.ok(focus)
  assert.equal(focus.occurrenceTitle, '2C · Tecnologia')
  assert.equal(focus.startAt, `${DATE}T14:00:00`)
  assert.equal(focus.endAt, `${DATE}T15:00:00`)
  assert.deepEqual(focus.action, {
    kind: 'CLASS',
    label: 'Apri la classe',
    href: '/classi/section-2c',
  })
  assert.equal(focus.continuity?.detail, 'Riprendere la misura dell’oggetto e confrontare gli errori.')
  assert.equal(
    focus.contextNotice,
    'Il collegamento al Piano annuale non è abbastanza certo: mantengo orario, classe e continuità disponibili senza inventare la lezione.',
  )
})

test('teacher-first focus never invents an action without a section', () => {
  const base = preparation()
  const focus = buildTodayTeachingFocus({
    preparation: preparation({ lesson: { ...base.lesson, sectionId: null } }),
    localDate: DATE,
    minuteOfDay: 13 * 60 + 30,
  })

  assert.ok(focus)
  assert.equal(focus.action, null)
})

test('Diary continuity is presented as Riprendi il filo, not as a fabricated resumable draft', () => {
  const focus = buildTodayTeachingFocus({
    preparation: preparation({
      continuity: {
        nextActivity: 'Riprendere gli errori di misura con un esempio concreto.',
        sourceSessionId: 'session-1',
        sourceLocalDate: '2026-10-15',
      },
    }),
    localDate: DATE,
    minuteOfDay: 13 * 60 + 30,
  })

  assert.ok(focus)
  assert.deepEqual(focus.continuity, {
    label: 'Riprendi il filo',
    detail: 'Riprendere gli errori di misura con un esempio concreto.',
    href: '/classi/section-2c/lezioni/B03?mode=prepare',
  })
  assert.equal('resume' in focus, false)
})

test('teacher-first focus omits continuity when no real Diary continuation exists', () => {
  const focus = buildTodayTeachingFocus({ preparation: preparation(), localDate: DATE, minuteOfDay: 13 * 60 + 30 })
  assert.ok(focus)
  assert.equal(focus.continuity, null)
})

test('provisional timetable authority remains explicit', () => {
  const base = preparation()
  const focus = buildTodayTeachingFocus({
    preparation: preparation({ lesson: { ...base.lesson, authority: 'PROVISIONAL_DRAFT' } }),
    localDate: DATE,
    minuteOfDay: 13 * 60 + 30,
  })

  assert.ok(focus)
  assert.equal(focus.authority, 'PROVISIONAL_DRAFT')
  assert.equal(focus.authorityLabel, 'Orario provvisorio')
})

test('no preparation means no teacher-first lesson focus', () => {
  assert.equal(buildTodayTeachingFocus({ preparation: null, localDate: DATE, minuteOfDay: 13 * 60 + 30 }), null)
})