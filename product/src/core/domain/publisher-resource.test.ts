import assert from 'node:assert/strict'
import test from 'node:test'
import { publisherResourcesForAdoption } from './publisher-resource'
import {
  classifyTeachingMaterial,
  textbookTeachingKitForAdoption,
} from './textbook-teaching-kit'

const zanichelliTextbook = {
  isbn13: '9788808950758',
  title: 'Tecnologia.verde',
  publisher: 'Zanichelli',
}

test('confirmed Tecnologia.verde textbook exposes bounded course and account resources', () => {
  const resources = publisherResourcesForAdoption({
    status: 'CONFIRMED',
    textbook: zanichelliTextbook,
  })

  assert.deepEqual(resources.map((resource) => resource.kind), [
    'BOOK_SITE',
    'CURRICULUM_ALIGNMENT',
    'LIBRARY',
    'EXERCISES',
  ])
  assert.deepEqual(resources.map((resource) => resource.audience), ['TEACHER', 'PUBLIC', 'ACCOUNT_HOLDER', 'TEACHER'])
  assert.ok(resources.every((resource) => resource.provider === 'ZANICHELLI'))
  assert.ok(resources.every((resource) => {
    const url = new URL(resource.url)
    return url.protocol === 'https:' && (url.hostname === 'zanichelli.it' || url.hostname.endsWith('.zanichelli.it'))
  }))
})

test('course-specific pointers use official Tecnologia.verde entry points', () => {
  const resources = publisherResourcesForAdoption({
    status: 'CONFIRMED',
    textbook: zanichelliTextbook,
  })

  assert.equal(resources.find((resource) => resource.kind === 'BOOK_SITE')?.url, 'https://online.scuola.zanichelli.it/tecnologiaverde2ed/')
  assert.equal(resources.find((resource) => resource.kind === 'CURRICULUM_ALIGNMENT')?.url, 'https://staticmy.zanichelli.it/catalogo/assets/aC7.9788808264572.pdf')
  assert.equal(resources.find((resource) => resource.kind === 'CURRICULUM_ALIGNMENT')?.accessModel, 'PUBLIC_WEB')
})

test('generic Zanichelli textbook keeps only generic account resources', () => {
  const resources = publisherResourcesForAdoption({
    status: 'CONFIRMED',
    textbook: { ...zanichelliTextbook, isbn13: '9788808123456', title: 'Altro corso Zanichelli' },
  })

  assert.deepEqual(resources.map((resource) => resource.kind), ['LIBRARY', 'EXERCISES'])
  assert.ok(resources.every((resource) => resource.accessModel === 'EXTERNAL_ACCOUNT'))
})

test('proposed textbook does not expose publisher resources', () => {
  assert.deepEqual(publisherResourcesForAdoption({
    status: 'PROPOSED',
    textbook: zanichelliTextbook,
  }), [])
})

test('confirmed textbook from another publisher does not receive Zanichelli resources', () => {
  assert.deepEqual(publisherResourcesForAdoption({
    status: 'CONFIRMED',
    textbook: {
      ...zanichelliTextbook,
      publisher: 'Altro Editore',
    },
  }), [])
})

test('publisher matching accepts a legal publisher suffix but not a partial-name collision', () => {
  assert.equal(publisherResourcesForAdoption({
    status: 'CONFIRMED',
    textbook: {
      ...zanichelliTextbook,
      publisher: 'Zanichelli Editore S.p.A.',
    },
  }).length, 4)

  assert.deepEqual(publisherResourcesForAdoption({
    status: 'CONFIRMED',
    textbook: {
      ...zanichelliTextbook,
      publisher: 'NotZanichelli',
    },
  }), [])
})

test('publisher resource pointers never contain credentials or session material', () => {
  const serialized = JSON.stringify(publisherResourcesForAdoption({
    status: 'CONFIRMED',
    textbook: zanichelliTextbook,
  })).toLowerCase()

  for (const forbidden of ['password', 'credential', 'token', 'cookie', 'session']) {
    assert.equal(serialized.includes(forbidden), false)
  }
})

test('confirmed Tecnologia.verde exposes one bounded pilot kit shared by the course', () => {
  const kit = textbookTeachingKitForAdoption({
    status: 'CONFIRMED',
    textbook: zanichelliTextbook,
  })

  assert.ok(kit)
  assert.equal(kit.id, 'KIT-TV2ED-01')
  assert.equal(kit.guide.title, 'Idee per insegnare')
  assert.equal(kit.guide.isbn13, '9788808667861')
  assert.equal(kit.guide.pages, 144)
  assert.equal(kit.slots.length, 4)
  assert.ok(kit.slots.every((slot) => slot.requiredForPilot))
  assert.deepEqual(kit.slots.map((slot) => slot.id), [
    'PROGRAMMING_COMPETENCIES',
    'LESSON_POWERPOINT',
    'ASSESSMENT',
    'ACCESSIBLE_ASSESSMENT',
  ])
  assert.equal(kit.publicAlignment.role, 'EDITORIAL_ALIGNMENT')
})

test('pilot kit is unavailable for an unconfirmed or unrelated textbook', () => {
  assert.equal(textbookTeachingKitForAdoption({
    status: 'PROPOSED',
    textbook: zanichelliTextbook,
  }), null)
  assert.equal(textbookTeachingKitForAdoption({
    status: 'CONFIRMED',
    textbook: { ...zanichelliTextbook, isbn13: '9788808123456' },
  }), null)
})

test('pedagogical classifier distinguishes accessible assessment from ordinary assessment', () => {
  const accessible = classifyTeachingMaterial({
    title: 'Prova di verifica ad alta leggibilità',
    summary: 'Verifica semplificata sui materiali.',
    category: 'ASSESSMENT',
    sourceMetadata: { materialRole: 'TEXTBOOK_TEACHER_MATERIAL' },
  })
  const ordinary = classifyTeachingMaterial({
    title: 'Prova di verifica sui materiali',
    category: 'ASSESSMENT',
    sourceMetadata: { materialRole: 'TEXTBOOK_TEACHER_MATERIAL' },
  })

  assert.deepEqual(accessible.roles.slice(0, 2), ['INCLUSION', 'ASSESSMENT'])
  assert.equal(accessible.primaryRole, 'INCLUSION')
  assert.equal(accessible.confidence, 'HIGH')
  assert.deepEqual(ordinary.roles, ['ASSESSMENT'])
  assert.equal(ordinary.primaryRole, 'ASSESSMENT')
})

test('pedagogical classifier distinguishes presentation and planning support', () => {
  const presentation = classifyTeachingMaterial({
    title: 'Lezione PowerPoint sui materiali',
    category: 'TEACHING_RESOURCE',
  })
  const planning = classifyTeachingMaterial({
    title: 'Programmazione per competenze',
    category: 'PROGRAMMING',
  })

  assert.deepEqual(presentation.roles, ['EXPLANATION', 'VISUAL_SUPPORT'])
  assert.equal(presentation.primaryRole, 'EXPLANATION')
  assert.deepEqual(planning.roles, ['PLANNING_SUPPORT'])
  assert.equal(planning.primaryRole, 'PLANNING_SUPPORT')
})

test('pedagogical classifier does not invent a role for a generic editorial file', () => {
  const classification = classifyTeachingMaterial({
    title: 'Materiale docente',
    summary: 'Contenuto del libro.',
    category: 'TEACHING_RESOURCE',
    sourceMetadata: { materialRole: 'TEXTBOOK_TEACHER_MATERIAL' },
  })

  assert.deepEqual(classification.roles, [])
  assert.equal(classification.primaryRole, null)
  assert.equal(classification.confidence, 'LOW')
})
