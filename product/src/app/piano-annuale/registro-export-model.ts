// @trama-readonly — derives an explicit export payload from canonical planning data; no persistence or remote mutation.
import type { AnnualPlanExecutionSnapshot, AnnualPlanGrade } from '@/core/domain/annual-plan-execution'
import {
  buildRegistroTeachingProjection,
  type RegistroTeachingProjectionV1,
} from '@/core/application/registro-teaching-projection'
import { APPROVED_HUMAN_TASK_RUNTIME_PROJECTIONS } from '@/core/presentation/human-task-approved-registry'
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

function canonicalUdaTitleMap() {
  const titles = new Map<string, string>()
  for (const projection of APPROVED_HUMAN_TASK_RUNTIME_PROJECTIONS) {
    const key = `${projection.grade}:${projection.udaCode}`
    const existing = titles.get(key)
    if (existing && existing !== projection.udaTitle) {
      throw new Error(`CONFLICTING_CANONICAL_UDA_TITLE:${key}`)
    }
    titles.set(key, projection.udaTitle)
  }
  return titles
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
  const titles = canonicalUdaTitleMap()
  const groups = new Map<string, ReturnType<typeof buildBlocks>>()

  for (const block of buildBlocks(grade)) {
    const current = groups.get(block.uda) ?? []
    current.push(block)
    groups.set(block.uda, current)
  }

  return [...groups.entries()].map(([udaCode, blocks]) => {
    const title = titles.get(`${grade}:${udaCode}`)
    if (!title) throw new Error(`MISSING_CANONICAL_UDA_TITLE:${grade}:${udaCode}`)

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

  const classes = input.snapshot.sections.map((section) => {
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
