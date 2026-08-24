import { NextResponse } from 'next/server'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildPlannerAssistantContext } from '@/core/presentation/planner-assistant-context'

export const dynamic = 'force-dynamic'

export async function GET() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const plannerRepository = new SupabasePlannerRepository()
  const tasks = await plannerRepository.listByWorkspace(context.workspace.id)
  const assistantContext = buildPlannerAssistantContext({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear?.id ?? null,
    localDate: currentRomeDate(),
    tasks,
  })

  return NextResponse.json(assistantContext, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
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
