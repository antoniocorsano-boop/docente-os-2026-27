import type { AcademicYear, WorkspaceContext } from '@/core/domain/workspace'

export interface CreateAcademicYearInput {
  workspaceId: string
  label: string
  startsOn: string
  endsOn: string
  isActive?: boolean
}

export interface WorkspaceRepository {
  bootstrapPersonalWorkspace(name?: string): Promise<string>
  getCurrentContext(): Promise<WorkspaceContext | null>
  createAcademicYear(input: CreateAcademicYearInput): Promise<AcademicYear>
}
