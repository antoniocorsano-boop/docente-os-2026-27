import assert from 'node:assert/strict'
import test from 'node:test'
import { FEEDBACK_ASSERTION, UI_FEEDBACK, isMutationCandidate, matchesPattern } from './lib.mjs'

test('detects HTTP mutations', () => {
  assert.equal(isMutationCandidate("fetch('/api/x', { method: 'POST', body: '{}' })"), true)
  assert.equal(isMutationCandidate("axios.patch('/api/x', payload)"), true)
  assert.equal(isMutationCandidate("axios.delete('/api/x')"), true)
})

test('does not classify a read-only form by markup alone', () => {
  assert.equal(isMutationCandidate('<form><input name="q" /></form>'), false)
})

test('detects persistence mutations', () => {
  assert.equal(isMutationCandidate("localStorage.setItem('x','y')"), true)
  assert.equal(isMutationCandidate("client.from('x').update({a:1})"), true)
})

test('generic error/success words are not feedback evidence', () => {
  assert.equal(UI_FEEDBACK.test("const { error } = await save()"), false)
  assert.equal(UI_FEEDBACK.test("const success = true"), false)
})

test('requires observable UI feedback markers', () => {
  assert.equal(UI_FEEDBACK.test('<div role="status" aria-live="polite">Saved</div>'), true)
  assert.equal(FEEDBACK_ASSERTION.test("screen.getByRole('status')"), true)
  assert.equal(FEEDBACK_ASSERTION.test("expect(error).toBeNull()"), false)
})

test('glob matcher binds evidence to the declared surface', () => {
  assert.equal(matchesPattern('src/features/**/actions.ts','src/features/lesson/actions.ts'), true)
  assert.equal(matchesPattern('src/features/**/actions.ts','src/other/file.ts'), false)
})


test('explicit markers resolve ambiguous custom code', () => {
  assert.equal(isMutationCandidate('function updatePreview() {}'), false)
  assert.equal(isMutationCandidate('/* @trama-write */ function createCustomRecord() {}'), true)
  assert.equal(isMutationCandidate('/* @trama-readonly */ localStorage.setItem("x","y")'), false)
})
