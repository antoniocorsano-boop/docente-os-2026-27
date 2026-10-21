'use server'

import {
  completePlannerTask as completePlannerTaskCanonical,
  createPlannerTask as createPlannerTaskCanonical,
  movePlannerTaskToday as movePlannerTaskTodayCanonical,
  movePlannerTaskTomorrow as movePlannerTaskTomorrowCanonical,
  movePlannerTaskWeek as movePlannerTaskWeekCanonical,
  reopenPlannerTask as reopenPlannerTaskCanonical,
  unschedulePlannerTask as unschedulePlannerTaskCanonical,
  waitPlannerTask as waitPlannerTaskCanonical,
} from '@/app/attivita/actions'

// Compatibility bridge during the IA migration. Generic PlannerTask ownership
// has moved to /attivita; Task 3 removes these imports from Oggi entirely.
// Keep explicit async exports here because Next.js validates every runtime export
// from a `use server` module as a Server Action during the production build.
export async function createPlannerTask(formData: FormData) {
  return createPlannerTaskCanonical(formData)
}

export async function completePlannerTask(formData: FormData) {
  return completePlannerTaskCanonical(formData)
}

export async function waitPlannerTask(formData: FormData) {
  return waitPlannerTaskCanonical(formData)
}

export async function reopenPlannerTask(formData: FormData) {
  return reopenPlannerTaskCanonical(formData)
}

export async function movePlannerTaskToday(formData: FormData) {
  return movePlannerTaskTodayCanonical(formData)
}

export async function movePlannerTaskTomorrow(formData: FormData) {
  return movePlannerTaskTomorrowCanonical(formData)
}

export async function movePlannerTaskWeek(formData: FormData) {
  return movePlannerTaskWeekCanonical(formData)
}

export async function unschedulePlannerTask(formData: FormData) {
  return unschedulePlannerTaskCanonical(formData)
}
