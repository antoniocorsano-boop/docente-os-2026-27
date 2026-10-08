'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { decodeAtlasMaterialBundle } from '@/core/domain/atlas-material-handoff'
import type { LessonDesignExtensionDraft } from '@/core/domain/lesson-design-extension'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCanonicalPlanSourceRepository } from '@/core/infrastructure/supabase/supabase-canonical-plan-source-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'

export type AtlasMaterialBindState = { error: string | null }

export async function bindAtlasMaterialsToLesson(
  _state: AtlasMaterialBindState,
  formData: FormData,
): Promise<AtlasMaterialBindState> {
  const encodedBundle = formString(formData, 'bundle')
  const sectionId = formString(formData, 'sectionId')
  const blockId = formString(formData, 'blockId').toUpperCase()
  const expectedUda = formString(formData, 'expectedUda')

  if (!encodedBundle || !sectionId || !blockId || !expectedUda) {
    return { error: 'Scegli una lezione prima di continuare.' }
  }

  let bundle
  try {
    bundle = decodeAtlasMaterialBundle(encodedBundle)
  } catch {
    return { error: 'I materiali ricevuti da Atlas non sono validi.' }
  }
  if (bundle.sourceUdaId !== expectedUda) {
    return { error: 'Questi materiali non appartengono all’UDA corrente.' }
  }

  const workspace = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!workspace?.academicYear) return { error: 'Il contesto dell’anno scolastico non è disponibile.' }

  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const snapshot = await annualRepository.list(workspace.workspace.id, workspace.academicYear.id)
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section) return { error: 'La classe selezionata non è disponibile.' }

  const grade = GRADE_UI[section.grade]
  const block = buildBlocks(grade).find((item) => item.id === blockId)
  if (!block || block.uda !== expectedUda) {
    return { error: 'La lezione scelta non appartiene a questa UDA.' }
  }

  const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
  if (!projection) return { error: 'Questa lezione non è ancora pronta per ricevere materiali.' }

  const source = CANONICAL_PLAN_SOURCES[grade]
  const runtimeSource = await new SupabaseCanonicalPlanSourceRepository().resolve({
    workspaceId: workspace.workspace.id,
    academicYearId: workspace.academicYear.id,
    code: source.code,
  })
  if (!runtimeSource) {
    return { error: 'Il piano annuale della classe non è ancora collegato alla sorgente canonica.' }
  }

  const lessonContext = {
    workspaceId: workspace.workspace.id,
    academicYearId: workspace.academicYear.id,
    sectionId: section.id,
    canonicalPlanAssetId: runtimeSource.assetId,
    canonicalGenerationId: runtimeSource.generationId,
    blockId: block.id,
    projectionId: projection.projectionId,
  }
  const repository = new SupabaseLessonDesignRepository()
  const drafts: LessonDesignExtensionDraft[] = bundle.items.map((item) => ({
    ...lessonContext,
    kind: item.type === 'worksheet' ? 'STUDENT_RESOURCE' : 'TEACHER_RESOURCE',
    insertionPosition: 'END',
    anchorStepId: null,
    title: item.title,
    body: item.description,
    cue: null,
    minutes: null,
    sourceKind: 'ATLAS',
    sourceRef: `atlas:${item.materialId}`,
    sourceLabel: 'Studio Atlas',
    payload: {
      dedupeKey: `atlas-material:${bundle.sourceUdaId}:${item.materialId}`,
      title: item.title,
      area: 'atlas_materials',
      sourceUdaId: bundle.sourceUdaId,
      bundleId: bundle.bundleId,
      materialId: item.materialId,
      atlasMaterialType: item.type,
      publicUrl: item.previewRef,
      origin: 'atlas',
    },
  }))

  try {
    await repository.acceptAtlasMaterialBundle(lessonContext, drafts)
  } catch {
    return { error: 'Non è stato possibile associare i materiali. Riprova senza perdere la selezione.' }
  }

  const lessonHref = `/classi/${encodeURIComponent(section.id)}/lezioni/${encodeURIComponent(block.id)}?mode=prepare`
  revalidatePath(`/classi/${section.id}/lezioni/${block.id}`)
  redirect(lessonHref)
}

function formString(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}
