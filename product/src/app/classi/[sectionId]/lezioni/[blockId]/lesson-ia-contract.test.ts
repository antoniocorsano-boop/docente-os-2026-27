import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
const shellSource = readFileSync(new URL('./lesson-shell.tsx', import.meta.url), 'utf8')
const clientSources = [
  './lesson-prepare-client.tsx',
  './lesson-live-client.tsx',
  './lesson-observe-client.tsx',
  './lesson-close-client.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('
')

test('Lezione resolves visible state server-side from canonical context', () => {
  assert.match(pageSource, /resolveLessonWorkspaceState/)
  assert.match(pageSource, /date\?: string/)
  assert.match(pageSource, /occurrence\?: string/)
  assert.match(pageSource, /intent\?: string/)
  assert.match(pageSource, /subtask\?: string/)
})

test('legacy mode remains compatibility input only and does not define visible phase navigation', () => {
  assert.match(pageSource, /mode\?: string/)
  assert.doesNotMatch(shellSource, /PHASES/)
  assert.doesNotMatch(shellSource, /aria-label="Fasi della lezione"/)
  assert.doesNotMatch(shellSource, /data-lesson-phase/)
  assert.doesNotMatch(shellSource, /buildPhaseHref/)
})

test('LessonShell is a context and status header, not a phase selector', () => {
  assert.doesNotMatch(shellSource, /LessonShellPhase/)
  assert.doesNotMatch(shellSource, /phase:/)
  assert.match(shellSource, /statusLabel/)
})

test('new lesson UI emits canonical intent and subtask routes, never phase mode routes', () => {
  assert.doesNotMatch(clientSources, /\?mode=(?:prepare|teach|observe|record)/)
  assert.doesNotMatch(clientSources, /buildLessonWorkspaceHref/)
  assert.match(clientSources, /buildCanonicalLessonWorkspaceHref/)
  assert.match(clientSources, /intent:\s*'start'/)
  assert.match(clientSources, /intent:\s*'close'/)
  assert.match(clientSources, /subtask:\s*'observe'/)
})
