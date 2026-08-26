import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSettingsExperienceModel } from './settings-experience-model'

const baseSettings = {
  teacherDisplayName: 'Docente',
  schoolName: 'Istituto Comprensivo',
  schoolType: 'Secondaria di primo grado',
  dailyPeriodCount: 6,
  schoolDayStart: '08:00',
  defaultPeriodMinutes: 60,
  teachingWeekdays: [1, 2, 3, 4, 5, 6],
}

const discipline = { id: 'd1', name: 'Tecnologia', isActive: true }
const confirmedSection = { id: 's1', status: 'CONFERMATA' as const }
const pendingSection = { id: 's2', status: 'DA_CONFERMARE' as const }

const confirmedAssignment = {
  id: 'a1',
  sectionId: 's1',
  disciplineId: 'd1',
  status: 'CONFIRMED' as const,
  weeklyMinutes: 120,
}

test('complete essential context enters maintenance mode while textbooks remain optional', () => {
  const model = buildSettingsExperienceModel({
    settings: baseSettings,
    disciplines: [discipline],
    sections: [confirmedSection],
    assignments: [confirmedAssignment],
  })

  assert.equal(model.mode, 'MAINTENANCE')
  assert.equal(model.readyCount, 6)
  assert.equal(model.totalCount, 6)
  assert.equal(model.nextArea, null)
  assert.equal(model.areas.find((area) => area.key === 'textbooks')?.status, 'OPTIONAL')
})

test('missing disciplines block cattedra and guide to disciplines first', () => {
  const model = buildSettingsExperienceModel({
    settings: baseSettings,
    disciplines: [],
    sections: [confirmedSection],
    assignments: [],
  })

  assert.equal(model.mode, 'GUIDED')
  assert.equal(model.nextArea?.key, 'disciplines')
  assert.equal(model.areas.find((area) => area.key === 'assignments')?.status, 'INCOMPLETE')
})

test('unconfirmed classes are reviewable while missing cattedra remains incomplete', () => {
  const model = buildSettingsExperienceModel({
    settings: baseSettings,
    disciplines: [discipline],
    sections: [confirmedSection, pendingSection],
    assignments: [confirmedAssignment],
  })

  assert.equal(model.areas.find((area) => area.key === 'classes')?.status, 'REVIEW')
  assert.equal(model.areas.find((area) => area.key === 'assignments')?.status, 'INCOMPLETE')
  assert.match(model.areas.find((area) => area.key === 'assignments')?.summary ?? '', /1 classe da associare/)
})

test('provisional teaching assignments require review after every class is covered', () => {
  const model = buildSettingsExperienceModel({
    settings: baseSettings,
    disciplines: [discipline],
    sections: [confirmedSection, { ...confirmedSection, id: 's2' }],
    assignments: [
      confirmedAssignment,
      { ...confirmedAssignment, id: 'a2', sectionId: 's2', status: 'PROVISIONAL' as const },
    ],
  })

  assert.equal(model.areas.find((area) => area.key === 'assignments')?.status, 'REVIEW')
  assert.equal(model.nextArea?.key, 'assignments')
})

test('a proposed textbook becomes an explicit settings review step', () => {
  const model = buildSettingsExperienceModel({
    settings: baseSettings,
    disciplines: [discipline],
    sections: [confirmedSection],
    assignments: [confirmedAssignment],
    textbookAdoptions: [{ teachingAssignmentId: 'a1', status: 'PROPOSED', usageKind: 'ADOPTED' }],
  })

  assert.equal(model.areas.find((area) => area.key === 'textbooks')?.status, 'REVIEW')
  assert.equal(model.nextArea?.key, 'textbooks')
})

test('a confirmed adopted textbook completes the textbook area', () => {
  const model = buildSettingsExperienceModel({
    settings: baseSettings,
    disciplines: [discipline],
    sections: [confirmedSection],
    assignments: [confirmedAssignment],
    textbookAdoptions: [{ teachingAssignmentId: 'a1', status: 'CONFIRMED', usageKind: 'ADOPTED' }],
  })

  assert.equal(model.areas.find((area) => area.key === 'textbooks')?.status, 'COMPLETE')
  assert.equal(model.nextArea, null)
})

test('incomplete professional context is always the first guided step', () => {
  const model = buildSettingsExperienceModel({
    settings: { ...baseSettings, teacherDisplayName: '' },
    disciplines: [],
    sections: [],
    assignments: [],
  })

  assert.equal(model.nextArea?.key, 'context')
  assert.equal(model.readyCount, 2)
})
