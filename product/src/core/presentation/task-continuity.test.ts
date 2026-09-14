import assert from 'node:assert/strict'
import test from 'node:test'
import { asKnowledgeTaskMode, buildTaskAwareKnowledgeHref, buildTaskAwareKnowledgeListHref, sanitizeInternalReturnTo } from './task-continuity'

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
