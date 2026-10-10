import assert from 'node:assert/strict'
import test from 'node:test'
import {
  asKnowledgeTaskMode,
  buildTaskAwareClassHref,
  buildTaskAwareKnowledgeHref,
  buildTaskAwareKnowledgeListHref,
  parseClassTaskEntry,
  sanitizeInternalReturnTo,
} from './task-continuity'

test('task-aware knowledge href preserves the operational return path', () => {
  const href = buildTaskAwareKnowledgeHref('asset 1', {
    mode: 'prepare',
    returnTo: '/progetta?grade=prima&section=s1&block=B01#focus-operativo',
    sectionId: 's1',
    blockId: 'B01',
  })
  assert.match(href, /^\/knowledge\/asset%201\?/)
  const query = new URLSearchParams(href.split('?')[1])
  assert.equal(query.get('mode'), 'prepare')
  assert.equal(query.get('returnTo'), '/progetta?grade=prima&section=s1&block=B01#focus-operativo')
  assert.equal(query.get('section'), 's1')
  assert.equal(query.get('block'), 'B01')
})

test('task-aware knowledge list href preserves class context and filters', () => {
  const href = buildTaskAwareKnowledgeListHref({
    mode: 'class',
    returnTo: '/classi/section-2c',
    sectionId: 'section-2c',
    blockId: 'B01',
    classLabel: '2C',
    category: 'TEACHING_RESOURCE',
    query: 'agricoltura',
  })
  const query = new URLSearchParams(href.split('?')[1])
  assert.equal(href.startsWith('/knowledge?'), true)
  assert.equal(query.get('mode'), 'class')
  assert.equal(query.get('returnTo'), '/classi/section-2c')
  assert.equal(query.get('section'), 'section-2c')
  assert.equal(query.get('block'), 'B01')
  assert.equal(query.get('classLabel'), '2C')
  assert.equal(query.get('category'), 'TEACHING_RESOURCE')
  assert.equal(query.get('q'), 'agricoltura')
})

test('return path is restricted to internal navigation', () => {
  assert.equal(sanitizeInternalReturnTo('https://evil.example/path', '/knowledge'), '/knowledge')
  assert.equal(sanitizeInternalReturnTo('//evil.example/path', '/knowledge'), '/knowledge')
  assert.equal(sanitizeInternalReturnTo('/classi/abc?x=1', '/knowledge'), '/classi/abc?x=1')
})

test('knowledge task mode only accepts canonical values', () => {
  assert.equal(asKnowledgeTaskMode('prepare'), 'prepare')
  assert.equal(asKnowledgeTaskMode('class'), 'class')
  assert.equal(asKnowledgeTaskMode('other'), null)
})

test('class task links preserve canonical prepare teach and record modes', () => {
  for (const mode of ['prepare', 'teach', 'record'] as const) {
    const href = buildTaskAwareClassHref('section 2/c', {
      mode,
      blockId: 'B07',
      returnTo: '/?from=home',
    })
    assert.match(href, /^\/classi\/section%202%2Fc\?/)
    const query = new URLSearchParams(href.split('?')[1])
    assert.equal(query.get('mode'), mode)
    assert.equal(query.get('block'), 'B07')
    assert.equal(query.get('returnTo'), '/?from=home')
  }
})

test('class task links omit malformed or out-of-range block hints', () => {
  for (const blockId of ['B00', 'B34', 'b01', 'B1', 'C01', '../B01']) {
    const href = buildTaskAwareClassHref('section-2c', {
      mode: 'prepare',
      blockId,
      returnTo: '/',
    })
    const query = new URLSearchParams(href.split('?')[1])
    assert.equal(query.get('block'), null)
  }
})

test('class task entry rejects malformed hints and external return targets', () => {
  assert.deepEqual(
    parseClassTaskEntry(
      { mode: 'other', block: 'B34', returnTo: 'https://evil.example/path' },
      '/classi/section-2c',
    ),
    { mode: null, blockId: null, returnTo: '/classi/section-2c' },
  )
  assert.deepEqual(
    parseClassTaskEntry(
      { mode: 'teach', block: 'B03', returnTo: '//evil.example/path' },
      '/classi/section-2c',
    ),
    { mode: 'teach', blockId: 'B03', returnTo: '/classi/section-2c' },
  )
})

test('class task continuity round-trips deterministically', () => {
  const href = buildTaskAwareClassHref('section-2c', {
    mode: 'record',
    blockId: 'B33',
    returnTo: '/?source=home#home-full-view',
  })
  const url = new URL(href, 'https://docente-os.local')
  const parsed = parseClassTaskEntry(
    {
      mode: url.searchParams.get('mode'),
      block: url.searchParams.get('block'),
      returnTo: url.searchParams.get('returnTo'),
    },
    '/classi/section-2c',
  )
  assert.deepEqual(parsed, {
    mode: 'record',
    blockId: 'B33',
    returnTo: '/?source=home#home-full-view',
  })
})
