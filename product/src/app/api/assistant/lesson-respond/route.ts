import { NextResponse } from 'next/server'
import { OpenAiLessonCopilot } from '@/core/infrastructure/ai/openai-lesson-copilot'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  appendLocalReplanningDecisions,
  fallbackLessonCopilotResponse,
} from '@/core/presentation/teacher-copilot-context'
import { loadAuthoritativeLessonCopilotContext } from '../lesson-context-loader'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await safeJson(request)
  if (!body) return NextResponse.json({ error: 'invalid_json' }, { status: 400 })

  const sectionId = cleanString(body.sectionId, 200)
  const blockId = cleanString(body.blockId, 20)
  const prompt = cleanString(body.prompt, 4000)
  if (!sectionId || !blockId || !prompt) {
    return NextResponse.json({ error: 'missing_lesson_prompt' }, { status: 400 })
  }

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const current = await workspaceRepository.getCurrentContext()
  if (!current) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!current.academicYear) return NextResponse.json({ error: 'academic_year_required' }, { status: 409 })

  // Rebuild authoritative context server-side. Never accept AssistantContext from the client.
  const context = await loadAuthoritativeLessonCopilotContext({
    workspaceId: current.workspace.id,
    academicYearId: current.academicYear.id,
    sectionId,
    blockId,
  })
  if (!context) return NextResponse.json({ error: 'lesson_context_not_found' }, { status: 404 })

  const copilot = new OpenAiLessonCopilot()
  if (!copilot.available) {
    return responseJson(fallbackLessonCopilotResponse(context, prompt), 'fallback')
  }

  try {
    const response = await copilot.respond({ context, prompt })
    return responseJson(appendLocalReplanningDecisions(context, response, prompt), 'model')
  } catch (error: unknown) {
    // Do not log prompt, transcript or provider response bodies.
    console.warn('[DOCENTE OS] Lesson copilot provider unavailable', safeErrorClass(error))
    return responseJson(fallbackLessonCopilotResponse(context, prompt), 'fallback')
  }
}

function responseJson(response: ReturnType<typeof fallbackLessonCopilotResponse>, mode: 'model' | 'fallback') {
  return NextResponse.json({ ...response, mode }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

async function safeJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json()
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  } catch {
    return null
  }
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized || normalized.length > maxLength) return null
  return normalized
}

function safeErrorClass(error: unknown) {
  return error instanceof Error ? error.name : 'UnknownError'
}
