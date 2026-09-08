import assert from 'node:assert/strict'
import test from 'node:test'
import { publisherResourcesForAdoption } from './publisher-resource'

const zanichelliTextbook = {
  isbn13: '9788808950758',
  title: 'Tecnologia.verde',
  publisher: 'Zanichelli',
}

test('confirmed Zanichelli textbook exposes only official external resource pointers', () => {
  const resources = publisherResourcesForAdoption({
    status: 'CONFIRMED',
    textbook: zanichelliTextbook,
  })

  assert.deepEqual(resources.map((resource) => resource.kind), [
    'EBOOK',
    'EXERCISES',
    'VIRTUAL_CLASS',
    'TEACHER_RESOURCES',
  ])
  assert.ok(resources.every((resource) => resource.provider === 'ZANICHELLI'))
  assert.ok(resources.every((resource) => resource.accessLevel === 'TEACHER_RESERVED'))
  assert.ok(resources.every((resource) => resource.requiresExternalLogin))
  assert.ok(resources.every((resource) => {
    const hostname = new URL(resource.url).hostname
    return hostname === 'zanichelli.it' || hostname.endsWith('.zanichelli.it')
  }))
})

test('proposed textbook does not activate publisher entitlements', () => {
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

test('publisher resource pointers never contain credentials or session material', () => {
  const serialized = JSON.stringify(publisherResourcesForAdoption({
    status: 'CONFIRMED',
    textbook: {
      ...zanichelliTextbook,
      publisher: 'Zanichelli Editore S.p.A.',
    },
  })).toLowerCase()

  for (const forbidden of ['password', 'credential', 'token', 'cookie', 'session']) {
    assert.equal(serialized.includes(forbidden), false)
  }
})
