// @trama-readonly — derives an explicit export payload from canonical planning data; no persistence or remote mutation.
import type { AnnualPlanExecutionSnapshot, AnnualPlanGrade } from '@/core/domain/annual-plan-execution'
import {
  buildRegistroTeachingProjection,
  type RegistroTeachingProjectionV1,
} from '@/core/application/registro-teaching-projection'
import { APPROVED_HUMAN_TASK_RUNTIME_PROJECTIONS } from '@/core/presentation/human-task-approved-registry'
import { resolveHumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import {
  buildBlocks,
  GRADE_UI,
  type CanonicalPlanRuntimeSources,
  type GradeKey,
} from './model'

export type BuildRegistroTeachingProjectionFromAnnualPlanInput = {
  snapshot: AnnualPlanExecutionSnapshot
  runtimeSources: CanonicalPlanRuntimeSources
  schoolYear: string
  disciplineName: string
  generatedAt: string
  provenance: {
    sourceCommit: string
    sourceBranch: string
  }
}

const GRADE_NUMBER: Record<AnnualPlanGrade, 1 | 2 | 3> = {
  PRIMA: 1,
  SECONDA: 2,
  TERZA: 3,
}

function canonicalTitleForBlock(grade: GradeKey, block: ReturnType<typeof buildBlocks>[number]) {
  const legacyProjection = resolveHumanTaskLessonProjection(grade, block)
  const approvedProjection = APPROVED_HUMAN_TASK_RUNTIME_PROJECTIONS.find(
    (projection) => projection.grade === grade && projection.blockId.toUpperCase() === block.id.toUpperCase(),
  )

  const candidates = [legacyProjection?.udaTitle, approvedProjection?.udaTitle].filter(
    (value): value is string => Boolean(value?.trim()),
  )
  const unique = [...new Set(candidates)]
  if (unique.length > 1) throw new Error(`CONFLICTING_CANONICAL_UDA_TITLE:${grade}:${block.id}`)
  return unique[0] ?? null
}

function uniqueInOrder(values: readonly string[]) {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function projectedUdasForGrade(grade: GradeKey, generationId: string) {
  const groups = new Map<string, ReturnType<typeof buildBlocks>>()

  for (const block of buildBlocks(grade)) {
    const current = groups.get(block.uda) ?? []
    current.push(block)
    groups.set(block.uda, current)
  }

  return [...groups.entries()].map(([udaCode, blocks]) => {
    const titles = uniqueInOrder(
      blocks
        .map((block) => canonicalTitleForBlock(grade, block))
        .filter((value): value is string => value !== null),
    )
    if (titles.length === 0) throw new Error(`MISSING_CANONICAL_UDA_TITLE:${grade}:${udaCode}`)
    if (titles.length > 1) throw new Error(`CONFLICTING_CANONICAL_UDA_TITLE:${grade}:${udaCode}`)
    const title = titles[0]!

    const periods = uniqueInOrder(blocks.map((block) => block.period))
    const focuses = uniqueInOrder(blocks.map((block) => block.focus))
    const packRefs = uniqueInOrder(blocks.flatMap((block) => [block.pack, ...block.supportPacks]))

    return {
      sourceUdaRef: udaCode,
      title,
      focus: focuses.join(' / '),
      plannedHours: blocks.reduce((total, block) => total + block.hours, 0),
      period: periods.join(' / '),
      packRefs,
      canonicalGenerationId: generationId,
    }
  })
}

export function buildRegistroTeachingProjectionFromAnnualPlan(
  input: BuildRegistroTeachingProjectionFromAnnualPlanInput,
): RegistroTeachingProjectionV1 {
  if (!/^[0-9a-f]{40}$/.test(input.provenance.sourceCommit)) {
    throw new Error('INVALID_SOURCE_COMMIT')
  }
  if (!input.provenance.sourceBranch.trim()) throw new Error('INVALID_SOURCE_BRANCH')

  const orderedSections = [...input.snapshot.sections].sort((left, right) => {
    const gradeDelta = GRADE_NUMBER[left.grade] - GRADE_NUMBER[right.grade]
    if (gradeDelta !== 0) return gradeDelta

    const leftCode = left.sectionCode.trim().toUpperCase()
    const rightCode = right.sectionCode.trim().toUpperCase()
    if (leftCode !== rightCode) return leftCode < rightCode ? -1 : 1
    if (left.id === right.id) return 0
    return left.id < right.id ? -1 : 1
  })

  const classes = orderedSections.map((section) => {
    const gradeKey = GRADE_UI[section.grade]
    const source = input.runtimeSources[gradeKey]
    if (!source) throw new Error(`MISSING_CANONICAL_PLAN_SOURCE:${gradeKey}`)

    const grade = GRADE_NUMBER[section.grade]
    const sectionCode = section.sectionCode.trim().toUpperCase()
    if (!sectionCode) throw new Error(`INVALID_SECTION_CODE:${section.id}`)

    return {
      sourceSectionId: section.id,
      grade,
      sectionCode,
      compactLabel: `${grade}${sectionCode}`,
      displayLabel: `${grade}ª ${sectionCode}`,
      sectionStatus: section.status,
      canonicalPlan: {
        code: source.code,
        assetId: source.assetId,
        generationId: source.generationId,
      },
      udas: projectedUdasForGrade(gradeKey, source.generationId).map(({ canonicalGenerationId: _generationId, ...uda }) => uda),
    }
  })

  return buildRegistroTeachingProjection({
    schoolYear: input.schoolYear,
    disciplineName: input.disciplineName,
    generatedAt: input.generatedAt,
    provenance: input.provenance,
    classes,
  })
}
