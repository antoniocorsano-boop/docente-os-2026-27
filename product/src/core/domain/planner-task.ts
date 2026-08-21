export type PlannerTaskStatus = 'OPEN' | 'WAITING' | 'DONE' | 'CANCELLED'

export type PlannerTaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export type PlannerTaskSourceKind =
  | 'MANUAL'
  | 'COMMUNICATION'
  | 'CALENDAR'
  | 'TEACHING'
  | 'DOCUMENT'
  | 'SYSTEM'

export type PlannerTask = {
  id: string
  workspaceId: string
  academicYearId: string | null
  title: string
  notes: string | null
  status: PlannerTaskStatus
  priority: PlannerTaskPriority
  dueAt: string | null
  plannedFor: string | null
  sourceKind: PlannerTaskSourceKind
  sourceRef: string | null
  createdBy: string
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreatePlannerTaskInput = {
  workspaceId: string
  academicYearId?: string | null
  title: string
  notes?: string | null
  priority?: PlannerTaskPriority
  dueAt?: string | null
  plannedFor?: string | null
  sourceKind?: PlannerTaskSourceKind
  sourceRef?: string | null
}
