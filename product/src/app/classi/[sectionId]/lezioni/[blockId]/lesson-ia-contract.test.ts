import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')
const shellSource = readFileSync(new URL('./lesson-shell.tsx', import.meta.url), 'utf8')
const approvalActionSource = readFileSync(new URL('./preparation-approval-actions.ts', import.meta.url), 'utf8')
const prepareClientSource = readFileSync(new URL('./lesson-prepare-client.tsx', import.meta.url), 'utf8')
const liveClientSource = readFileSync(new URL('./lesson-live-client.tsx', import.meta.url), 'utf8')
const observeClientSource = readFileSync(new URL('./lesson-observe-client.tsx', import.meta.url), 'utf8')
const materialsWorkspaceSource = readFileSync(new URL('./lesson-materials-workspace.tsx', import.meta.url), 'utf8')
const closeClientSource = readFileSync(new URL('./lesson-close-client.tsx', import.meta.url), 'utf8')
const clientSources = [prepareClientSource, liveClientSource, observeClientSource, materialsWorkspaceSource, closeClientSource].join(String.fromCharCode(10))

test('Lezione resolves visible state server-side from canonical context', () => {
  assert.match(pageSource, /resolveLessonWorkspaceState/)
  assert.match(pageSource, /date\?: string/)
  assert.match(pageSource, /occurrence\?: string/)
  assert.match(pageSource, /intent\?: string/)
  assert.match(pageSource, /subtask\?: string/)
})

test('legacy mode remains compatibility input only and does not define visible phase navigation', () => {
  assert.match(pageSource, /mode\?: string/)
  assert.doesNotMatch(shellSource, /\bPHASES\b/)
  assert.doesNotMatch(shellSource, /aria-label="Fasi della lezione"/)
  assert.doesNotMatch(shellSource, /data-lesson-phase/)
  assert.doesNotMatch(shellSource, /buildPhaseHref/)
})

test('LessonShell is a context and status header, not a phase selector', () => {
  assert.doesNotMatch(shellSource, /LessonShellPhase/)
  assert.doesNotMatch(shellSource, /\bphase:/)
  assert.match(shellSource, /statusLabel/)
})

test('new lesson UI emits canonical intent and subtask routes, never phase mode routes', () => {
  assert.doesNotMatch(clientSources, /\?mode=(?:prepare|teach|observe|record)/)
  assert.doesNotMatch(clientSources, /\bbuildLessonWorkspaceHref\b/)
  assert.match(clientSources, /buildCanonicalLessonWorkspaceHref/)
  assert.match(clientSources, /intent:\s*'start'/)
  assert.match(clientSources, /intent:\s*'close'/)
  assert.match(clientSources, /subtask:\s*'observe'/)
  assert.doesNotMatch(approvalActionSource, /\?mode=/)
  assert.match(approvalActionSource, /buildCanonicalLessonWorkspaceHref/)
})

test('explicit start intent survives contextual observation and materials navigation', () => {
  const serverPropPasses = pageSource.match(/explicitStartIntent=\{requestedIntent === 'start'\}/g) ?? []
  assert.equal(serverPropPasses.length, 3)
  assert.match(liveClientSource, /intent:\s*explicitStartIntent\s*\?\s*'start'\s*:\s*null/)
  assert.match(observeClientSource, /intent:\s*explicitStartIntent\s*\?\s*'start'\s*:\s*null/)
  assert.match(materialsWorkspaceSource, /intent:\s*explicitStartIntent\s*\?\s*'start'\s*:\s*null/)
})

test('materials subtask renders before teaching and registration state branches', () => {
  const materialsBranch = pageSource.indexOf("activeSubtask === 'materials' ? (")
  const teachingBranch = pageSource.indexOf("visibleState === 'TEACHING' || visibleState === 'CONTINUITY' ? (")
  const registrationBranch = pageSource.indexOf("visibleState === 'REGISTRATION' ? (")
  assert.ok(materialsBranch >= 0)
  assert.ok(teachingBranch >= 0)
  assert.ok(registrationBranch >= 0)
  assert.ok(materialsBranch < teachingBranch)
  assert.ok(materialsBranch < registrationBranch)
  assert.match(pageSource.slice(materialsBranch, teachingBranch), /LessonMaterialsWorkspace/)
})

test('occurrence registration is derived only from occurrence-bound TeachingSession evidence', () => {
  assert.doesNotMatch(pageSource, /registeredByProgress/)
  assert.match(
    pageSource,
    /const registered = !occurrenceContext\.occurrence\s*\?\s*false\s*:\s*await occurrenceHasBlockRegistration\(/,
  )
})

test('registration submit follows the editable registration date', () => {
  assert.match(closeClientSource, /disabled=\{saving \|\| !draftLoaded \|\| voiceBusy \|\| !registrationLocalDate \|\| !actualMinutes\}/)
  assert.doesNotMatch(closeClientSource, /disabled=\{saving \|\| !draftLoaded \|\| voiceBusy \|\| !localDate \|\| !actualMinutes\}/)
})
