import type { ExperienceMode, HumanIntent, HumanTaskContext } from './human-task-model'

export const INTELLIGENT_UI_VERSION = 'iui.v1' as const

export type IntelligentSurface = 'HOME' | 'CLASS'
export type SemanticBlockId = 'TASK_FOCUS' | 'LESSON_FOCUS'

export type RegisteredActionId =
  | 'HOME_OPEN_PLANNER'
  | 'HOME_OPEN_TIMETABLE'
  | 'HOME_OPEN_CLASS'
  | 'HOME_OPEN_LESSON'
  | 'HOME_SHOW_ALL'
  | 'CLASS_OPEN_MODELED_LESSON'
  | 'CLASS_OPEN_INLINE_RECORDER'
  | 'CLASS_OPEN_COMPLETION'
  | 'CLASS_OPEN_PLANNING'
  | 'CLASS_SHOW_ALL'

export type UIContext = {
  surface: IntelligentSurface
  task: HumanTaskContext
  mode: ExperienceMode
  contextSummary: string
  reason: string
  sectionId?: string | null
  blockId?: string | null
}

export type CompositionBlock = {
  id: SemanticBlockId
  eyebrow: string
  title: string
  description: string
  secondaryDescription?: string | null
  meta: readonly string[]
}

export type CompositionAction = {
  id: RegisteredActionId
  label: string
  href: string
}

export type SurfaceComposition = {
  version: typeof INTELLIGENT_UI_VERSION
  surface: IntelligentSurface
  intent: HumanIntent
  mode: ExperienceMode
  contextSummary: string
  reason: string
  primaryBlock: CompositionBlock
  supportBlocks: readonly CompositionBlock[]
  primaryAction: CompositionAction | null
  supportActions: readonly CompositionAction[]
  fullViewAction: CompositionAction
  source: 'DETERMINISTIC'
  fallbackReason?: string | null
}
