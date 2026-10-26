import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

async function source() {
  return readFile(new URL('./today-lesson-binding-loader.ts', import.meta.url), 'utf8')
}

test('Today lesson binding loader stays narrow and excludes full preparation dependencies', async () => {
  const text = await source()

  assert.match(text, /SupabaseAnnualPlanExecutionRepository/)
  assert.match(text, /SupabaseTeachingAssignmentReader/)
  assert.match(text, /SupabaseTeacherSettingsRepository/)
  assert.match(text, /SupabaseCanonicalPlanSourceRepository/)
  assert.match(text, /buildClassWorkspaceLearningFocus\([\s\S]*runtimeSource\.generationId,[\s\S]*\[\],[\s\S]*\)/)

  assert.doesNotMatch(text, /SupabaseKnowledgeRepository/)
  assert.doesNotMatch(text, /SupabaseTeachingSessionRepository/)
  assert.doesNotMatch(text, /loadAuthoritativeLessonCopilotBundle/)
  assert.doesNotMatch(text, /buildLessonPreparationManifest/)
  assert.doesNotMatch(text, /buildInternalLessonMaterialRenderBundle/)
  assert.doesNotMatch(text, /loadLessonPreparationBundlesForLessons/)
})

test('Today lesson binding loader fails closed before resolving a route', async () => {
  const text = await source()

  assert.match(text, /if \(!lesson\.sectionId \|\| !lesson\.disciplineId\) return null/)
  assert.match(text, /assignment\.status === 'CONFIRMED'/)
  assert.match(text, /!discipline\.isActive/)
  assert.match(text, /!canonicalPlanSupportsDisciplineName\(discipline\.name\)/)
  assert.match(text, /if \(!focus\.nextBlock\) return null/)
})

test('Today lesson binding loader deduplicates canonical source resolution by source code', async () => {
  const text = await source()

  assert.match(text, /const sourceByCode = new Map<string, Promise<CanonicalSource>>\(\)/)
  assert.match(text, /let sourcePromise = sourceByCode\.get\(code\)/)
  assert.match(text, /if \(!sourcePromise\) \{[\s\S]*sourceRepository\.resolve\([\s\S]*sourceByCode\.set\(code, sourcePromise\)/)
})
