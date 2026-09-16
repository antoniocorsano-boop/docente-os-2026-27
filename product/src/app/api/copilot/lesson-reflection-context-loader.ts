import { randomUUID } from 'node:crypto'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { assembleLessonReflectionCopilotContext } from '@/core/application/copilot/copilot-context-assembler'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'

const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const

export type LessonReflectionSurface = {
  sectionId: string
  blockId: string
}

export type LessonReflectionContextLoadResult =
  | { status: 'READY'; context: ReturnType<typeof assembleLessonReflectionCopilotContext>['context']; target: ReturnType<typeof assembleLessonReflectionCopilotContext>['target'] }
  | { status: 'UNAUTHORIZED' }
  | { status: 'BLOCKED'; message: string }

export async function loadLessonReflectionCopilotContext(
  surface: LessonReflectionSurface,
): Promise<LessonReflectionContextLoadResult> {
  const current = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!current) return { status: 'UNAUTHORIZED' }
  if (!current.academicYear) return { status: 'BLOCKED', message: 'Anno scolastico attivo non disponibile.' }

  const snapshot = await new SupabaseAnnualPlanExecutionRepository().list(
    current.workspace.id,
    current.academicYear.id,
  )
  const section = snapshot.sections.find((item) => item.id === surface.sectionId)
  if (!section) return { status: 'BLOCKED', message: 'La classe non appartiene al Piano annuale attivo.' }

  const grade = GRADE_UI[section.grade]
  const block = buildBlocks(grade).find((item) => item.id === surface.blockId.toUpperCase())
  if (!block) return { status: 'BLOCKED', message: 'La lezione non appartiene al Piano annuale attivo.' }

  const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
  const source = CANONICAL_PLAN_SOURCES[grade]
  const assembled = assembleLessonReflectionCopilotContext({
    runId: randomUUID(),
    localDate: currentRomeDate(),
    workspaceId: current.workspace.id,
    academicYearId: current.academicYear.id,
    sectionId: section.id,
    sectionLabel: `${GRADE_NUMBER[section.grade]}ª ${section.sectionCode}`,
    blockId: block.id,
    projectionId: projection?.projectionId ?? null,
    lessonTitle: projection?.title ?? block.focus ?? block.title,
    canonicalPlanRef: source.assetId,
    canonicalPlanLabel: `Piano annuale ${GRADE_NUMBER[section.grade]}ª ${section.sectionCode}`,
  })

  return { status: 'READY', ...assembled }
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
