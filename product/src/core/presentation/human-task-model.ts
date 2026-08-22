export type HumanIntent = 'ACT_NOW' | 'PREPARE' | 'TEACH' | 'RECORD' | 'REVIEW' | 'EXPLORE'
export type ContextSpecificity = 'NONE' | 'CONTEXTUAL' | 'SPECIFIC'
export type ExperienceMode = 'EXPLORE' | 'GUIDED' | 'FOCUSED'

export type HumanTaskContext = {
  intent: HumanIntent
  specificity: ContextSpecificity
  objectLabel?: string | null
  contextLabel?: string | null
  stateLabel?: string | null
}

export type InteractionBudget = {
  primaryActions: 1
  supportingActions: number
  showOverview: boolean
  showAdvancedByDefault: boolean
  collapseSecondaryContent: boolean
}

export const HUMAN_INTENT_LABELS: Record<HumanIntent, string> = {
  ACT_NOW: 'Agisci adesso',
  PREPARE: 'Prepara',
  TEACH: 'Usa in classe',
  RECORD: 'Registra',
  REVIEW: 'Rivedi',
  EXPLORE: 'Esplora',
}

export function resolveExperienceMode(context: Pick<HumanTaskContext, 'specificity'>): ExperienceMode {
  if (context.specificity === 'SPECIFIC') return 'FOCUSED'
  if (context.specificity === 'CONTEXTUAL') return 'GUIDED'
  return 'EXPLORE'
}

export function interactionBudget(mode: ExperienceMode): InteractionBudget {
  if (mode === 'FOCUSED') {
    return {
      primaryActions: 1,
      supportingActions: 2,
      showOverview: false,
      showAdvancedByDefault: false,
      collapseSecondaryContent: true,
    }
  }
  if (mode === 'GUIDED') {
    return {
      primaryActions: 1,
      supportingActions: 3,
      showOverview: true,
      showAdvancedByDefault: false,
      collapseSecondaryContent: true,
    }
  }
  return {
    primaryActions: 1,
    supportingActions: 5,
    showOverview: true,
    showAdvancedByDefault: true,
    collapseSecondaryContent: false,
  }
}

export function humanTaskBreadcrumb(context: HumanTaskContext) {
  return [context.contextLabel, context.objectLabel, context.stateLabel].filter((value): value is string => Boolean(value && value.trim()))
}

export function shouldProgressivelyDisclose(context: HumanTaskContext) {
  return resolveExperienceMode(context) !== 'EXPLORE'
}
