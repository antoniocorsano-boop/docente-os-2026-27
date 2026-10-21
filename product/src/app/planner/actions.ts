'use server'

// Compatibility bridge during the IA migration. Generic PlannerTask ownership
// has moved to /attivita; Task 3 removes these imports from Oggi entirely.
export {
  completePlannerTask,
  createPlannerTask,
  movePlannerTaskToday,
  movePlannerTaskTomorrow,
  movePlannerTaskWeek,
  reopenPlannerTask,
  unschedulePlannerTask,
  waitPlannerTask,
} from '@/app/attivita/actions'
