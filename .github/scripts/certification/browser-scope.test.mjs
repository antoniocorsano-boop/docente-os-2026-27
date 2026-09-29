import test from 'node:test'
import assert from 'node:assert/strict'
import { browserSupportGateDependencies, deriveHvaScope } from './browser-scope.mjs'

test('classroom fixture only requalifies HVA', () => {
  assert.deepEqual(browserSupportGateDependencies('product/e2e/support/classroom-material-fixture.mjs'), ['HVA'])
})

test('direct AAL2 helper requalifies HVA and X4 only', () => {
  assert.deepEqual(browserSupportGateDependencies('product/e2e/support/direct-aal2-supabase.mjs'), ['HVA', 'X4_PLANNER_WRITE'])
})

test('share target runtime uses focused HVA', () => {
  const scope = deriveHvaScope([
    'product/src/app/share-target/page.tsx',
    'product/src/app/share-target/ShareTargetIntake.tsx',
    'product/public/sw.js',
  ], { hvaRequired: true })
  assert.equal(scope.mode, 'FOCUSED')
  assert.deepEqual(scope.specs, [
    'e2e/experience/contextual-capabilities.spec.mjs',
    'e2e/experience/surfaces.spec.mjs',
  ])
})

test('app shell change requires full HVA', () => {
  const scope = deriveHvaScope([
    'product/src/components/app-shell/app-shell.tsx',
  ], { hvaRequired: true })
  assert.equal(scope.mode, 'FULL')
})

test('unknown user-facing runtime change fails closed to full HVA', () => {
  const scope = deriveHvaScope([
    'product/src/app/nuova-superficie/page.tsx',
  ], { hvaRequired: true })
  assert.equal(scope.mode, 'FULL')
})

test('classroom fixture runs focused classroom HVA specs', () => {
  const scope = deriveHvaScope([
    'product/e2e/support/classroom-material-fixture.mjs',
  ], { hvaRequired: true })
  assert.equal(scope.mode, 'FOCUSED')
  assert.deepEqual(scope.specs, [
    'e2e/experience/classroom-cockpit.spec.mjs',
    'e2e/experience/contextual-capabilities.spec.mjs',
    'e2e/experience/lesson-register.spec.mjs',
  ])
})

test('unmapped HVA-only support falls back to full HVA', () => {
  const scope = deriveHvaScope([
    'product/e2e/support/unmapped-hva-helper.mjs',
  ], { hvaRequired: true })
  assert.equal(scope.mode, 'FULL')
})
