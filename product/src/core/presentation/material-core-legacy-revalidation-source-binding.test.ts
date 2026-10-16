import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

function source(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

test('legacy class material revalidation is an explicit teacher action over exact canonical content', () => {
  const action = source('src/app/classi/[sectionId]/in-classe/[assetId]/material-revalidation-actions.ts')

  assert.match(action, /acceptLessonMaterialProposal/)
  assert.match(action, /digestMaterialContentV1/)
  assert.match(action, /SupabaseMaterialContentReadPortV1/)
  assert.match(action, /SupabaseLessonDesignRepository/)
  assert.match(action, /SupabaseCanonicalPlanSourceRepository/)
  assert.match(action, /currentGenerationId/)
  assert.match(action, /canonicalBlockId/)
  assert.match(action, /getClaims\(\)/)
  assert.doesNotMatch(action, /approvalState\s*[:=]\s*['"]APPROVED['"]/)
  assert.doesNotMatch(action, /updateMetadata|sourceMetadata\s*=|knowledge_assets[^\n]*update/i)
})

test('in-class cockpit exposes bounded manual revalidation only while canonical confirmation is absent', () => {
  const page = source('src/app/classi/[sectionId]/in-classe/[assetId]/page.tsx')

  assert.match(page, /revalidateLegacyClassMaterial/)
  assert.match(page, /approvalLabel\s*!==\s*['"]Confermato['"]/)
  assert.match(page, /name=['"]materialRole['"]/)
  assert.match(page, /name=['"]artifactKind['"]/)
  assert.match(page, /name=['"]audience['"]/)
  assert.match(page, /Ricollega questo materiale alla lezione/)
})

test('prepared-material architecture contract names canonical acceptance authority and preserves legacy metadata as history', () => {
  const contract = source('../docs/architecture/CLASS_PREPARED_MATERIALS_CONTRACT.md')

  assert.match(contract, /LessonMaterialBindingV1/)
  assert.match(contract, /READY/)
  assert.match(contract, /storica|storico/i)
  assert.match(contract, /Da riconfermare/)
  assert.match(contract, /non.*autorità.*canonica/i)
  assert.match(contract, /nessuna.*auto-?conferma/i)
})
