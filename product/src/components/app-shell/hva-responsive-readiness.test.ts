import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('HVA 320×800 measures Oggi only after the final surface is visible', () => {
  const source = readFileSync(
    new URL('../../../e2e/experience/product-ia-reset.spec.mjs', import.meta.url),
    'utf8',
  )
  const start = source.indexOf("test('DOS-IA-RESET responsive 320×800")
  const end = source.indexOf("test('DOS-IA-RESET responsive 390×844", start)

  assert.notEqual(start, -1)
  assert.notEqual(end, -1)

  const contract = source.slice(start, end)
  const navigation = contract.indexOf("await page.goto('/planner')")
  const readiness = contract.indexOf("await expect(page.locator('#dos-main-content')).toBeVisible()")
  const overflowCheck = contract.indexOf("await expectNoHorizontalOverflow(page, 'Oggi 320×800')")

  assert.notEqual(navigation, -1)
  assert.notEqual(readiness, -1)
  assert.notEqual(overflowCheck, -1)
  assert.ok(navigation < readiness, 'Oggi readiness must be checked after navigation')
  assert.ok(readiness < overflowCheck, 'Overflow must be measured only after Oggi is visible')
})
