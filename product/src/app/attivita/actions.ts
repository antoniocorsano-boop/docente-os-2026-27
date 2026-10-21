'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { PlannerTaskPriority } from '@/core/domain/planner-task'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

const ACTIVITIES_PATH = '/attivita'
const LEGACY_PLANNER_PATH = '/planner'

export async function createPlannerTask(formData: FormData) {
  const titleValue = formData.get('title')
  const title = typeof titleValue === 'string' ? titleValue.trim() : ''
  if (!title) return

  const priorityValue = formData.get('priority')
  const priority = asPriority(priorityValue)
  const destinationValue = formData.get('destination')
  const today = currentRomeDate()
  const plannedFor = destinationValue === 'tomorrow'
    ? addDays(today, 1)
    : destinationValue === 'week'
      ? addDays(today, 3)
      : destinationValue === 'undated'
        ? null
        : today

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const plannerRepository = new SupabasePlannerRepository()
  await plannerRepository.create({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear?.id ?? null,
    title,
    priority,
    plannedFor,
  })

  revalidatePlannerSurfaces()
}

export async function completePlannerTask(formData: FormData) {
  const taskId = taskIdFrom(formData)
  if (!taskId) return
  const repository = new SupabasePlannerRepository()
  await repository.setStatus(taskId, 'DONE')
  revalidatePlannerSurfaces()
}

export async function waitPlannerTask(formData: FormData) {
  const taskId = taskIdFrom(formData)
  if (!taskId) return
  const repository = new SupabasePlannerRepository()
  await repository.setStatus(taskId, 'WAITING')
  revalidatePlannerSurfaces()
}

export async function reopenPlannerTask(formData: FormData) {
  const taskId = taskIdFrom(formData)
  if (!taskId) return
  const repository = new SupabasePlannerRepository()
  await repository.setStatus(taskId, 'OPEN')
  revalidatePlannerSurfaces()
}

export async function movePlannerTaskToday(formData: FormData) {
  await moveTask(formData, currentRomeDate())
}

export async function movePlannerTaskTomorrow(formData: FormData) {
  await moveTask(formData, addDays(currentRomeDate(), 1))
}

export async function movePlannerTaskWeek(formData: FormData) {
  await moveTask(formData, addDays(currentRomeDate(), 3))
}

export async function unschedulePlannerTask(formData: FormData) {
  await moveTask(formData, null)
}

async function moveTask(formData: FormData, plannedFor: string | null) {
  const taskId = taskIdFrom(formData)
  if (!taskId) return
  const repository = new SupabasePlannerRepository()
  await repository.move(taskId, plannedFor)
  revalidatePlannerSurfaces()
}

function revalidatePlannerSurfaces() {
  revalidatePath(ACTIVITIES_PATH)
  // Temporary compatibility only: Task 3 removes generic PlannerTask controls from Oggi.
  revalidatePath(LEGACY_PLANNER_PATH)
}

function taskIdFrom(formData: FormData) {
  const taskId = formData.get('taskId')
  return typeof taskId === 'string' && taskId ? taskId : null
}

function asPriority(value: FormDataEntryValue | null): PlannerTaskPriority {
  return value === 'LOW' || value === 'HIGH' || value === 'URGENT' ? value : 'NORMAL'
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
