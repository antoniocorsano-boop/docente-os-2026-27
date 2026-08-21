import type {
  CreatePlannerTaskInput,
  PlannerTask,
  PlannerTaskStatus,
} from '@/core/domain/planner-task'

export interface PlannerRepository {
  listByWorkspace(workspaceId: string): Promise<PlannerTask[]>
  create(input: CreatePlannerTaskInput): Promise<PlannerTask>
  setStatus(taskId: string, status: PlannerTaskStatus): Promise<PlannerTask>
  move(taskId: string, plannedFor: string | null): Promise<PlannerTask>
}
