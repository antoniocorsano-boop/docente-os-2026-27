import { NextResponse } from 'next/server'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { loadAuthoritativeLessonCopilotContext } from '../lesson-context-loader'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sectionId = url.searchParams.get('sectionId')?.trim()
  const blockId = url.searchParams.get('blockId')?.trim()
  if (!sectionId || !blockId) {
    return NextResponse.json({ error: 'missing_lesson_context' }, { status: 400 })
  }

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const current = await workspaceRepository.getCurrentContext()
  if (!current) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!current.academicYear) return NextResponse.json({ error: 'academic_year_required' }, { status: 409 })

  const context = await loadAuthoritativeLessonCopilotContext({
    workspaceId: current.workspace.id,
    academicYearId: current.academicYear.id,
    sectionId,
    blockId,
  })
  if (!context) return NextResponse.json({ error: 'lesson_context_not_found' }, { status: 404 })

  return NextResponse.json(context, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
