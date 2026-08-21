'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export async function createPlannerTask(formData: FormData) {
  const titleValue = formData.get('title')
  const title = typeof titleValue === 'string' ? titleValue.trim() : ''
  if (!title) return

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const plannerRepository = new SupabasePlannerRepository()
  await plannerRepository.create({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear?.id ?? null,
    title,
    plannedFor: currentRomeDate(),
  })

  revalidatePath('/planner')
}

export async function completePlannerTask(formData: FormData) {
  const taskId = formData.get('taskId')
  if (typeof taskId !== 'string' || !taskId) return
  const repository = new SupabasePlannerRepository()
  await repository.setStatus(taskId, 'DONE')
  revalidatePath('/planner')
}

export async function waitPlannerTask(formData: FormData) {
  const taskId = formData.get('taskId')
  if (typeof taskId !== 'string' || !taskId) return
  const repository = new SupabasePlannerRepository()
  await repository.setStatus(taskId, 'WAITING')
  revalidatePath('/planner')
}

export async function reopenPlannerTask(formData: FormData) {
  const taskId = formData.get('taskId')
  if (typeof taskId !== 'string' || !taskId) return
  const repository = new SupabasePlannerRepository()
  await repository.setStatus(taskId, 'OPEN')
  revalidatePath('/planner')
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
