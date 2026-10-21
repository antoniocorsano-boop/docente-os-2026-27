import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const plannerSource = readFileSync(new URL('../../app/planner/page.tsx', import.meta.url), 'utf8')
const prepareSource = readFileSync(new URL('../../app/classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx', import.meta.url), 'utf8')
const materialsSource = readFileSync(new URL('../../app/classi/[sectionId]/lezioni/[blockId]/lesson-materials.tsx', import.meta.url), 'utf8')
const viewerSource = readFileSync(new URL('../../app/knowledge/[assetId]/page.tsx', import.meta.url), 'utf8')
const observeSource = readFileSync(new URL('../../app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx', import.meta.url), 'utf8')
const registerSource = readFileSync(new URL('../../app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx', import.meta.url), 'utf8')
const classroomRegisterUrl = new URL('../../app/classi/[sectionId]/in-classe/[assetId]/registra/page.tsx', import.meta.url)
const classroomRegisterSource = readFileSync(classroomRegisterUrl, 'utf8')
const appShellSource = readFileSync(new URL('../../components/app-shell/app-shell.tsx', import.meta.url), 'utf8')

test('OGGI keeps the canonical teaching task free from competing quick actions', () => {
  assert.ok(
    !plannerSource.includes('<TodayQuickActions materialsAvailable={materialsAvailable} sectionId={teachingSectionId} />'),
    'When a teaching focus exists, generic quick actions must not compete at the first visual level.',
  )
})

test('focused work uses the existing AppShell through a presentation-only focus mode', () => {
  assert.ok(appShellSource.includes('focusMode?: boolean'), 'AppShell must expose only an optional presentation-level focus mode.')
  assert.ok(appShellSource.includes("cn('dosShell', focusMode && 'dosShellFocused')"), 'Focused mode must be represented as presentation state on the existing shell.')
  assert.ok(appShellSource.includes('CommandPalette'), 'Focused mode must keep broader navigation reachable through the existing command surface.')
  assert.ok(appShellSource.includes('SecondaryMenu'), 'Focused mode must keep the existing subordinate navigation escape.')
})

test('OGGI subordinates broader navigation and secondary work when a teaching focus exists', () => {
  assert.ok(
    plannerSource.includes('focusMode={Boolean(teachingFocus)}'),
    'Teaching-focused OGGI must use the existing presentation-only focus mode so Home does not compete in mobile navigation.',
  )
  assert.ok(
    plannerSource.includes('data-today-secondary-work'),
    'Teaching-focused OGGI must group the rest of the day and generic tools behind one secondary disclosure.',
  )
})

test('healthy PREPARA keeps approval detail subordinate while blockers stay first-level', () => {
  assert.ok(
    prepareSource.includes("approval.status === 'APPROVED' ? (") && prepareSource.includes('data-preparation-approval-detail'),
    'A healthy approved preparation must collapse verbose authority detail without hiding blocking approval states.',
  )
})

test('PREPARA isolates MATERIALI as a focused subtask without losing preparation capabilities', () => {
  assert.ok(
    prepareSource.includes("if (activeSubtask === 'materials')") && prepareSource.includes('data-materials-focus'),
    'MATERIALI must render as a focused PREPARA subtask instead of extending the full preparation page.',
  )
  for (const capability of ['LessonDesignTools', 'prepChecklist', 'approveLessonPreparationAndProceed']) {
    assert.ok(prepareSource.includes(capability), `PREPARA capability must remain available after recomposition: ${capability}`)
  }
})

test('MATERIALI keeps technical rationale and version detail behind progressive disclosure', () => {
  assert.ok(
    materialsSource.includes('<details data-material-details'),
    'Material cards must keep long rationale, version and usage detail subordinate to the teacher decision.',
  )
})

test('focused lesson viewer exposes a content-first preview canvas', () => {
  assert.ok(
    viewerSource.includes('data-material-preview-canvas'),
    'The focused lesson viewer must identify a content-first preview canvas separate from Knowledge management chrome.',
  )
})

test('optional professional observation capture is disclosed instead of first-level', () => {
  assert.ok(
    observeSource.includes('<details data-observation-capture'),
    'Professional observation fields must live inside an optional disclosure in the healthy OSSERVA state.',
  )
})

test('REGISTRA exposes the frozen one-screen fast path instead of a mandatory wizard', () => {
  assert.ok(!registerSource.includes("type CloseStep = 'facts' | 'reflection' | 'confirm'"), 'REGISTRA must not require a three-step state machine.')
  assert.ok(!registerSource.includes('className={styles.closeStepper}'), 'REGISTRA must not render the mandatory Dati essenziali → Riflessione → Conferma stepper.')
  assert.ok(registerSource.includes('Esito effettivo'), 'The fast path must keep the effective outcome visible.')
  assert.ok(registerSource.includes('Prossima attività'), 'The fast path must keep next activity available in the registration surface.')
  assert.ok(registerSource.includes('Registra lezione'), 'The fast path must expose one explicit primary registration action.')
})

test('classroom REGISTRA uses a fast first level while preserving every professional capability', () => {
  const activityIndex = classroomRegisterSource.indexOf('activityDone')
  console.error('[visual-conformance-debug]', JSON.stringify({
    url: classroomRegisterUrl.href,
    length: classroomRegisterSource.length,
    hasActivityDone: classroomRegisterSource.includes('activityDone'),
    hasNameActivityDone: classroomRegisterSource.includes('name="activityDone"'),
    activityIndex,
    nearby: activityIndex >= 0
      ? classroomRegisterSource.slice(Math.max(0, activityIndex - 100), activityIndex + 160)
      : null,
  }))

  assert.ok(
    classroomRegisterSource.includes('data-classroom-register-advanced'),
    'The classroom register must place extended reflection and documentary controls behind progressive disclosure.',
  )
  assert.ok(classroomRegisterSource.includes('focusMode'), 'The classroom register must subordinate global navigation during the focused task.')
  for (const field of ['activityDone', 'observations', 'difficulties', 'ideas', 'udaChangeProposal', 'nextActivity', 'actualMinutes']) {
    assert.ok(classroomRegisterSource.includes(`name="${field}"`), `Classroom register capability must be preserved: ${field}`)
  }
  for (const capability of ['Google Drive', 'retryPendingDriveDiary', 'recordClassroomLesson']) {
    assert.ok(classroomRegisterSource.includes(capability), `Classroom register integration must remain available: ${capability}`)
  }
})