'use server'

import { revalidatePath } from 'next/cache'
import { persistTeachingSessionAdjustment } from '@/core/application/teaching-session-adjustment'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildBlocks, GRADE_UI } from '@/app/piano-annuale/model'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { parseTeachingSessionReflection } from '@/core/domain/teaching-session-reflection'

export async function promoteTeachingSessionAdjustment(formData: FormData) {
  const teachingSessionId = requiredText(formData, 'teachingSessionId')
  const blockId = requiredText(formData, 'blockId').toUpperCase()
  const sectionId = requiredText(formData, 'sectionId')

  const workspace = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!workspace?.academicYear) throw new Error('Active academic year required')

  const teachingRepository = new SupabaseTeachingSessionRepository()
  const session = await teachingRepository.getById(
    workspace.workspace.id,
    workspace.academicYear.id,
    teachingSessionId,
  )
  if (!session || session.sectionId !== sectionId) throw new Error('Teaching session is outside the active class')

  const reflection = parseTeachingSessionReflection(session.evidenceNote)
  const proposal = reflection?.udaChangeProposal?.trim() ?? ''
  if (!proposal) throw new Error('Teaching session has no replanning reflection')

  const grade = inferGradeFromBlock(blockId)
  const block = buildBlocks(grade).find((item) => item.id === blockId)
  if (!block) throw new Error('Block is outside the canonical annual plan')
  const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
  if (!projection) throw new Error('Canonical lesson projection is unavailable')

  const result = await persistTeachingSessionAdjustment({
    workspaceId: workspace.workspace.id,
    academicYearId: workspace.academicYear.id,
    teachingSessionId,
    blockId,
    proposal,
    projection,
  }, {
    teachingSessions: teachingRepository,
    lessonDesign: new SupabaseLessonDesignRepository(),
  })

  revalidatePath(`/classi/${sectionId}`)
  return { extensionId: result.id }
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} required`)
  return value.trim()
}

function inferGradeFromBlock(blockId: string) {
  for (const grade of Object.values(GRADE_UI)) {
    if (buildBlocks(grade).some((item) => item.id === blockId)) return grade
  }
  throw new Error('Block grade cannot be resolved')
}
