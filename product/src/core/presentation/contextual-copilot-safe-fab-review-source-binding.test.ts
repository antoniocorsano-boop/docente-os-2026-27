import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const materialsSource = readFileSync(
  'src/components/app-shell/lesson-materials-quick-action.tsx',
  'utf8',
)
const fabPositionSource = readFileSync(
  'src/components/assistant/use-contextual-fab-position.ts',
  'utf8',
)

test('lesson materials action is registered as a protected region for the contextual FAB', () => {
  assert.match(materialsSource, /data-copilot-protected/)
})

test('contextual FAB re-observes protected regions that mount after initial placement', () => {
  assert.match(fabPositionSource, /createProtectedRegionObservation/)
  assert.match(fabPositionSource, /MutationObserver/)
})

test('contextual FAB preserves native touch drag by disabling browser touch gestures on the trigger', () => {
  assert.match(fabPositionSource, /touchAction:\s*['"]none['"]/) 
})
