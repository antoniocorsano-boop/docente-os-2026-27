import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

async function read(relative: string) {
  return readFile(new URL(relative, import.meta.url), 'utf8')
}

test('CV2 HVA orchestrator preserves governed baseline preflight/postflight around browser acceptance', async () => {
  const workflow = await read('../../../../.github/workflows/browser-certification-orchestrator.yml')
  const preflight = workflow.indexOf('Verify governed baseline preflight')
  const browser = workflow.indexOf('Run Human + Visual Acceptance')
  const postflight = workflow.indexOf('Verify governed baseline postflight')
  const receipt = workflow.indexOf('Generate HVA acceptance receipt')

  assert.ok(preflight >= 0)
  assert.ok(browser > preflight)
  assert.ok(postflight > browser)
  assert.ok(receipt > postflight)
  assert.match(workflow, /hva-baseline-integrity\.mjs preflight/)
  assert.match(workflow, /hva-baseline-integrity\.mjs postflight/)
})

test('Oggi keeps an accessible calendar name even when mobile CSS hides the visible label', async () => {
  const page = await read('../../../app/planner/page.tsx')
  const css = await read('../../../app/planner/today-home.css')
  assert.match(page, /className="todayCalendarLink"[^>]*aria-label="Calendario"/)
  assert.match(css, /\.todayCalendarLink span\{display:none\}/)
})

test('optional textbook coverage badge does not lower foreground contrast through opacity', async () => {
  const css = await read('../../../app/impostazioni/libri-di-testo/textbooks.css')
  assert.match(css, /\.textbookCoverageBadge\.optional\s*\{\s*opacity:\s*1;/)
})

test('X3 no-write regression observes the canonical Activities surface instead of superseded Planner task summary', async () => {
  const x3 = await read('../../../../e2e/x3-acceptance.spec.mjs')
  assert.ok(x3.includes("page.goto('/attivita'"))
  assert.match(x3, /activityBoardSnapshot/)
  assert.doesNotMatch(x3, /Sintesi della giornata/)
})
