import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

function source(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), 'utf8')
}

test('class workspace composes prepared-material confirmation from exact lesson extensions and canonical content evidence', () => {
  const page = source('src/app/classi/[sectionId]/page.tsx')

  assert.match(page, /buildClassMaterialAcceptanceEvidenceV1/)
  assert.match(page, /SupabaseLessonDesignRepository/)
  assert.match(page, /SupabaseMaterialContentReadPortV1/)
  assert.match(page, /canonicalPlanAssetId:\s*source\.assetId/)
  assert.match(page, /canonicalGenerationId:\s*source\.generationId/)
  assert.match(page, /blockId:\s*nextCanonicalBlock\.id/)
  assert.match(page, /projectionId:\s*nextProjection\.projectionId/)
  assert.match(page, /selectPreparedClassMaterials\(section, knowledgeItems, today, acceptanceEvidence\)/)
})

test('in-class cockpit treats legacy block metadata only as a lookup hint before exact canonical evidence composition', () => {
  const page = source('src/app/classi/[sectionId]/in-classe/[assetId]/page.tsx')

  assert.match(page, /buildClassMaterialAcceptanceEvidenceV1/)
  assert.match(page, /SupabaseCanonicalPlanSourceRepository/)
  assert.match(page, /SupabaseLessonDesignRepository/)
  assert.match(page, /SupabaseMaterialContentReadPortV1/)
  assert.match(page, /canonicalBlockId/)
  assert.match(page, /blocks\.find\(\(item\) => item\.id === canonicalBlockId\)/)
  assert.match(page, /resolveRuntimeHumanTaskLessonProjection/)
  assert.match(page, /canonicalPlanAssetId:\s*source\.assetId/)
  assert.match(page, /canonicalGenerationId:\s*source\.generationId/)
  assert.match(page, /buildClassroomSessionView\(section, bundle\.asset, acceptanceEvidence\)/)
})
