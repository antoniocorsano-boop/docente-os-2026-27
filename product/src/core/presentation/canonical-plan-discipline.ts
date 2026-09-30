export const CURRENT_CANONICAL_PLAN_DISCIPLINE = 'Tecnologia'

export function canonicalPlanSupportsDisciplineName(name: string | null | undefined) {
  return normalizeDisciplineName(name) === normalizeDisciplineName(CURRENT_CANONICAL_PLAN_DISCIPLINE)
}

function normalizeDisciplineName(value: string | null | undefined) {
  return (value ?? '').trim().toLocaleLowerCase('it-IT')
}
