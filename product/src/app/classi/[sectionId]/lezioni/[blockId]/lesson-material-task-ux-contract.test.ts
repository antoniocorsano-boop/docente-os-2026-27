import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./lesson-design-tools.tsx', import.meta.url), 'utf8')

test('material preparation is organized around the teacher intent', () => {
  assert.ok(source.includes("type MaterialPreparationIntent = 'reuse' | 'adapt' | 'create'"))
  assert.ok(source.includes("useState<MaterialPreparationIntent>('reuse')"))
  assert.ok(source.includes('Prepara materiali'))
  assert.ok(source.includes('Riutilizza'))
  assert.ok(source.includes('Adatta'))
  assert.ok(source.includes('Crea nuovo'))
  assert.ok(source.includes("aria-pressed={materialIntent === 'reuse'}"))
  assert.ok(source.includes("aria-pressed={materialIntent === 'adapt'}"))
  assert.ok(source.includes("aria-pressed={materialIntent === 'create'}"))
})

test('changing material intent is local UI state and canonical acceptance stays explicit', () => {
  assert.ok(source.includes('type="button"'))
  assert.ok(source.includes('setMaterialIntent('))
  assert.ok(source.includes('name="designIntent" value="attach-knowledge"'))
  assert.ok(source.includes('name="designIntent" value="attach-atlas"'))
  assert.ok(source.includes('idle="Usa questo materiale"'))
})

test('providers remain provenance, not the primary material taxonomy', () => {
  assert.ok(!source.includes('<strong>Da Atlas</strong>'))
  assert.ok(source.includes('Materiali disponibili'))
  assert.ok(source.includes('<SourceProvenance kind="ATLAS" />'))
})

test('adapting a lesson material preserves the source and returns through review', () => {
  assert.ok(source.includes('materialProposals'))
  assert.ok(source.includes('acceptedResources'))
  assert.ok(source.includes('L’originale resta invariato'))
  assert.ok(source.includes('torna “Da controllare”'))
  assert.ok(source.includes('<EditExtensionForm'))
})

test('creating a new material reuses Knowledge capture without attaching implicitly', () => {
  assert.ok(source.includes('buildKnowledgeCaptureHref'))
  assert.ok(source.includes('capture=text'))
  assert.ok(source.includes('mode=prepare'))
  assert.ok(source.includes('Aggiungi un nuovo contenuto'))
})
