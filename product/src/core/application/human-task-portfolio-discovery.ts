import { buildBlocks, type GradeKey } from '@/app/piano-annuale/model'
import { discoverRuntimeHumanTaskCoveredBlockIds } from '@/core/presentation/human-task-runtime'

export const HUMAN_TASK_GRADE_ORDER = ['Prima', 'Seconda', 'Terza'] as const satisfies readonly GradeKey[]

export type HumanTaskPortfolioGradeState = {
  grade: GradeKey
  coveredBlockIds: string[]
  totalBlocks: number
  complete: boolean
}

export type HumanTaskPortfolioDiscovery = {
  grades: HumanTaskPortfolioGradeState[]
  nextGrade: GradeKey | null
  coveredBlockIds: string[]
  status: 'COMPLETE' | 'INCOMPLETE'
}

/**
 * Discovers the next incomplete Human Task grade from the runtime itself.
 * Callers must not seed a block range or assume which grade follows: the
 * canonical grade order and actual runtime coverage determine the frontier.
 */
export function discoverHumanTaskPortfolioFrontier(): HumanTaskPortfolioDiscovery {
  const grades = HUMAN_TASK_GRADE_ORDER.map((grade) => {
    const coveredBlockIds = discoverRuntimeHumanTaskCoveredBlockIds(grade)
    const totalBlocks = buildBlocks(grade).length
    return {
      grade,
      coveredBlockIds,
      totalBlocks,
      complete: coveredBlockIds.length === totalBlocks,
    } satisfies HumanTaskPortfolioGradeState
  })

  const next = grades.find((item) => !item.complete) ?? null
  return {
    grades,
    nextGrade: next?.grade ?? null,
    coveredBlockIds: next ? [...next.coveredBlockIds] : [],
    status: next ? 'INCOMPLETE' : 'COMPLETE',
  }
}
