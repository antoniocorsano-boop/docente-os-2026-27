import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const appShellSource = readFileSync(new URL('../../components/app-shell/app-shell.tsx', import.meta.url), 'utf8')
const assistantPanelSource = readFileSync(new URL('../../components/assistant/contextual-assistant-panel.tsx', import.meta.url), 'utf8')
const assistantSafeAreaCss = readFileSync(new URL('../../app/assistant-safe-area.css', import.meta.url), 'utf8')
const lessonPageSource = readFileSync(new URL('../../app/classi/[sectionId]/lezioni/[blockId]/page.tsx', import.meta.url), 'utf8')
const lessonShellSource = readFileSync(new URL('../../app/classi/[sectionId]/lezioni/[blockId]/lesson-shell.tsx', import.meta.url), 'utf8')
const lessonPrepareSource = readFileSync(new URL('../../app/classi/[sectionId]/lezioni/[blockId]/lesson-prepare-client.tsx', import.meta.url), 'utf8')
const lessonMaterialsCss = readFileSync(new URL('../../app/classi/[sectionId]/lezioni/[blockId]/lesson-design-tools.css', import.meta.url), 'utf8')
const classesSource = readFileSync(new URL('../../app/classi/page.tsx', import.meta.url), 'utf8')

test('lesson workspace identifies itself as Lezione without falsely selecting Classi in mobile navigation', () => {
  assert.match(appShellSource, /mobileContextLabel\?: string/)
  assert.match(appShellSource, /mobileNavigationActive\?: NavigationKey \| null/)
  assert.match(lessonPageSource, /mobileContextLabel="Lezione"/)
  assert.match(lessonPageSource, /mobileNavigationActive=\{null\}/)
})

test('lesson workspace exposes one primary return path instead of stacked Oggi and class breadcrumbs', () => {
  assert.match(lessonShellSource, /href="\/planner">← Oggi<\/Link>/)
  assert.doesNotMatch(lessonPrepareSource, /<Link className=\{styles\.back\} href=\{classHref\}>/)
})

test('lesson preparation keeps internal Arena and baseline vocabulary out of teacher-facing copy', () => {
  assert.doesNotMatch(lessonPrepareSource, /baseline Arena/)
  assert.doesNotMatch(lessonPrepareSource, /copertura curricolare soddisfatta/)
  assert.match(lessonPrepareSource, /Curricolo da confermare/)
  assert.match(lessonPrepareSource, /curricolo di questa classe/i)
})

test('lesson progress uses the same teacher-facing unit across class selector and preparation', () => {
  assert.doesNotMatch(classesSource, /blocchi registrati/)
  assert.match(classesSource, /lezioni concluse/)
  assert.match(lessonPrepareSource, /udaProgress\.completed\}\/\{udaProgress\.total\} lezioni concluse/)
})

test('mobile contextual copilot collapses to an accessible FAB and reserves content space', () => {
  assert.match(assistantPanelSource, /aria-label="Chiedi a DOCENTE OS su questa pagina"/)
  assert.match(appShellSource, /contextualAssistantEnabled && 'dosShellAssistantEnabled'/)
  assert.match(assistantSafeAreaCss, /\.dosAssistantFloatingTrigger\{[^}]*width:56px[^}]*height:56px[^}]*border-radius:50%/s)
  assert.match(assistantSafeAreaCss, /\.dosAssistantFloatingTrigger>span:last-child\{display:none\}/)
  assert.match(assistantSafeAreaCss, /\.dosShellAssistantEnabled \.dosContent\.workSurface\{[^}]*padding-bottom:calc\([^}]*\+ 88px\)/s)
})

test('material intent is rendered as one coherent three-way segmented control on mobile', () => {
  assert.match(lessonMaterialsCss, /\.lessonMaterialIntent\{[^}]*display:grid[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/s)
  assert.match(lessonMaterialsCss, /\.lessonMaterialIntent button\{[^}]*border-radius:/s)
  assert.match(lessonMaterialsCss, /\.lessonMaterialIntent button\[aria-pressed="true"\]\{[^}]*background:var\(--surface\)/s)
})
