import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

function source(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

test('accepted typed material references block destructive Knowledge deletion until explicit detach', () => {
  const migration = source('supabase/migrations/0103_material_reference_safety.sql')

  assert.match(migration, /0103_material_reference_safety/)
  assert.match(migration, /delete_own_knowledge_asset/)
  assert.match(migration, /lesson_design_extensions/)
  assert.match(migration, /status\s*=\s*'ACCEPTED'/)
  assert.match(migration, /materialBinding/)
  assert.match(migration, /docente-os\.lesson-material-binding\.v1/)
  assert.match(migration, /materialRef/)
  assert.match(migration, /assetId/)
  assert.match(migration, /detach_and_delete_own_knowledge_asset/)
  assert.match(migration, /dismiss_lesson_design_extension/)
  assert.match(migration, /detach or replace|detach.*before deletion/i)
})

test('acceptance locks and validates the exact Knowledge generation referenced by a typed binding', () => {
  const migration = source('supabase/migrations/0103_material_reference_safety.sql')

  assert.match(migration, /KNOWLEDGE_GENERATION/)
  assert.match(migration, /generationId/)
  assert.match(migration, /knowledge_processing_generations/)
  assert.match(migration, /status\s*=\s*'SUCCEEDED'/)
  assert.match(migration, /for key share/i)
  assert.match(migration, /before insert or update/i)
  assert.match(migration, /lesson_design_extensions/)
})

test('accepted generation identity stays exact and current-generation advancement cannot retarget it', () => {
  const resolver = source('src/core/application/material-content-resolution.ts')

  assert.match(resolver, /generationId:\s*input\.ref\.generationId/)
  assert.doesNotMatch(resolver, /generationId:\s*record\.currentGenerationId/)
  assert.match(resolver, /CONTENT_DIGEST_MISMATCH/)
})
