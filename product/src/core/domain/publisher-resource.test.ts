import assert from 'node:assert/strict'
import test from 'node:test'
import { publisherResourcesForAdoption } from './publisher-resource'

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
