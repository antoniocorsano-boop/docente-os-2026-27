const CANONICAL_PLAN_CURRICULUM_DISCIPLINE: Readonly<Record<string, string>> = {
  'CAN-PLAN-1': 'technology',
  'CAN-PLAN-2': 'technology',
  'CAN-PLAN-3': 'technology',
}

export function curriculumDisciplineRefForCanonicalPlan(planCode: string) {
  return CANONICAL_PLAN_CURRICULUM_DISCIPLINE[planCode] ?? null
}
