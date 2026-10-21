import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const plannerSource = readFileSync(new URL('../../app/planner/page.tsx', import.meta.url), 'utf8')
const viewerSource = readFileSync(new URL('../../app/knowledge/[assetId]/page.tsx', import.meta.url), 'utf8')
const observeSource = readFileSync(new URL('../../app/classi/[sectionId]/lezioni/[blockId]/lesson-observe-client.tsx', import.meta.url), 'utf8')
const registerSource = readFileSync(new URL('../../app/classi/[sectionId]/lezioni/[blockId]/lesson-close-client.tsx', import.meta.url), 'utf8')
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
