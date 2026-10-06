import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSettingsExperienceModel } from './settings-experience-model'

const baseSettings = {
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

test('DOS-VIEW-CONV-01B counts only the five essential settings in readiness', () => {
  const model = buildSettingsExperienceModel({
    settings: baseSettings,
    disciplines: [discipline],
    sections: [confirmedSection],
    assignments: [confirmedAssignment],
  })

  assert.equal(model.mode, 'MAINTENANCE')
  assert.equal(model.readyCount, 5)
  assert.equal(model.totalCount, 5)
  assert.equal(model.nextArea, null)
  assert.equal(model.areas.find((area) => area.key === 'textbooks')?.status, 'OPTIONAL')
  assert.equal(model.areas.find((area) => area.key === 'homeLinks')?.status, 'OPTIONAL')
})

test('DOS-VIEW-CONV-01B exposes the approved Settings IA labels and linked destinations', () => {
  const model = buildSettingsExperienceModel({
    settings: baseSettings,
    disciplines: [discipline],
    sections: [confirmedSection],
    assignments: [confirmedAssignment],
  })

  const labels = new Map(model.areas.map((area) => [area.key, area.label]))
  const hrefs = new Map(model.areas.map((area) => [area.key, area.href]))

  assert.equal(labels.get('classes'), 'Classi assegnate')
  assert.equal(labels.get('organization'), 'Settimana scolastica')
  assert.equal(labels.get('appDevice'), 'App e dispositivo')
  assert.equal(labels.get('homeLinks'), 'Accessi rapidi Home')
  assert.equal(labels.get('account'), 'Account e sicurezza')
  assert.equal(hrefs.get('appDevice'), '#installazione')
  assert.equal(hrefs.get('account'), '/account')
})

test('DOS-VIEW-CONV-01B groups settings according to the approved information architecture', () => {
  const model = buildSettingsExperienceModel({
    settings: baseSettings,
    disciplines: [discipline],
    sections: [confirmedSection],
    assignments: [confirmedAssignment],
  })

  const grouped = model.areas.map((area) => [area.key, (area as { group?: string }).group, (area as { kind?: string }).kind])
  assert.deepEqual(grouped, [
    ['context', 'assignment', 'ESSENTIAL'],
    ['disciplines', 'assignment', 'ESSENTIAL'],
    ['classes', 'assignment', 'ESSENTIAL'],
    ['assignments', 'assignment', 'ESSENTIAL'],
    ['organization', 'organization', 'ESSENTIAL'],
    ['textbooks', 'organization', 'OPTIONAL'],
    ['appDevice', 'device', 'OPTIONAL'],
    ['homeLinks', 'device', 'OPTIONAL'],
    ['account', 'identity', 'LINK'],
  ])
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

test('optional textbook review never forces GUIDED mode', () => {
  const model = buildSettingsExperienceModel({
    settings: baseSettings,
    disciplines: [discipline],
    sections: [confirmedSection],
    assignments: [confirmedAssignment],
    textbookAdoptions: [{ teachingAssignmentId: 'a1', status: 'PROPOSED', usageKind: 'ADOPTED' }],
  })

  assert.equal(model.areas.find((area) => area.key === 'textbooks')?.status, 'REVIEW')
  assert.equal(model.mode, 'MAINTENANCE')
  assert.equal(model.nextArea, null)
  assert.equal(model.readyCount, 5)
  assert.equal(model.totalCount, 5)
})

test('a confirmed adopted textbook stays optional to essential readiness', () => {
  const model = buildSettingsExperienceModel({
    settings: baseSettings,
    disciplines: [discipline],
    sections: [confirmedSection],
    assignments: [confirmedAssignment],
    textbookAdoptions: [{ teachingAssignmentId: 'a1', status: 'CONFIRMED', usageKind: 'ADOPTED' }],
  })

  assert.equal(model.areas.find((area) => area.key === 'textbooks')?.status, 'COMPLETE')
  assert.equal(model.nextArea, null)
  assert.equal(model.readyCount, 5)
  assert.equal(model.totalCount, 5)
})

test('incomplete professional context is always the first guided step', () => {
  const model = buildSettingsExperienceModel({
    settings: { ...baseSettings, schoolName: '' },
    disciplines: [],
    sections: [],
    assignments: [],
  })

  assert.equal(model.nextArea?.key, 'context')
  assert.equal(model.readyCount, 1)
  assert.equal(model.totalCount, 5)
})

test('optional areas never interrupt the guided configuration sequence', () => {
  const model = buildSettingsExperienceModel({
    settings: { ...baseSettings, schoolName: '' },
    disciplines: [],
    sections: [],
    assignments: [],
  })

  assert.equal(model.areas.find((area) => area.key === 'homeLinks')?.status, 'OPTIONAL')
  assert.equal(model.areas.find((area) => area.key === 'appDevice')?.status, 'OPTIONAL')
  assert.notEqual(model.nextArea?.key, 'homeLinks')
  assert.notEqual(model.nextArea?.key, 'appDevice')
  assert.equal(model.nextArea?.key, 'context')
})
