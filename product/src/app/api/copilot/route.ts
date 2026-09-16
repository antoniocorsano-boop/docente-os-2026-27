import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { loadCurrentTodayCopilotContext } from '@/app/api/assistant/today-context-loader'
import {
  loadLessonReflectionCopilotContext,
  type LessonReflectionSurface,
} from '@/app/api/copilot/lesson-reflection-context-loader'
import { assembleNextLessonPreparationCopilotContext } from '@/core/application/copilot/copilot-context-assembler'
import {
  handleLessonReflectionCapture,
  matchesLessonReflectionCaptureIntent,
} from '@/core/application/copilot/lesson-reflection-handler'
import {
  handleNextLessonPreparation,
  matchesNextLessonPreparationIntent,
} from '@/core/application/copilot/next-lesson-preparation-handler'

export const dynamic = 'force-dynamic'

const LESSON_SURFACE_HEADER = 'x-docente-surface-path'

export async function POST(request: Request) {
  const body = await readRequest(request)
  if (!body.ok) return privateJson({ error: body.error }, body.status)

  if (matchesLessonReflectionCaptureIntent(body.prompt)) {
    const surface = lessonRecordSurfaceFromRequest(request)
    if (!surface) {
      return privateJson({
        error: 'lesson_context_unavailable',
        message: 'La nota può essere organizzata soltanto dalla superficie di registrazione della lezione corrente.',
      }, 409)
    }

    const loaded = await loadLessonReflectionCopilotContext(surface)
    if (loaded.status === 'UNAUTHORIZED') return privateJson({ error: 'unauthorized' }, 401)
    if (loaded.status === 'BLOCKED') {
      return privateJson({ error: 'lesson_context_blocked', message: loaded.message }, 409)
    }

    const result = handleLessonReflectionCapture({
      context: loaded.context,
      target: loaded.target,
      prompt: body.prompt,
    })
    return privateJson(result, result.status === 'BLOCKED' ? 409 : 200)
  }

  if (!matchesNextLessonPreparationIntent(body.prompt)) {
    return privateJson({
      error: 'unsupported_intent',
      message: 'La frontdoor Copilot non dispone ancora di un handler autorizzato per questa richiesta.',
      supportedSkills: ['NEXT_LESSON_PREPARATION', 'LESSON_REFLECTION'],
    }, 422)
  }

  const loaded = await loadCurrentTodayCopilotContext()
  if (!loaded) return privateJson({ error: 'unauthorized' }, 401)

  const context = assembleNextLessonPreparationCopilotContext({
    runId: randomUUID(),
    today: loaded.context,
    manifest: loaded.preparation?.manifest ?? null,
  })

  const result = handleNextLessonPreparation({
    context,
    preparation: loaded.preparation?.preparation ?? null,
    manifest: loaded.preparation?.manifest ?? null,
  })

  return privateJson(result, result.status === 'BLOCKED' ? 409 : 200)
}

async function readRequest(request: Request): Promise<
  | { ok: true; prompt: string }
  | { ok: false; status: number; error: string }
> {
  const raw = await request.json().catch(() => null)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, status: 400, error: 'invalid_request' }
  }

  const record = raw as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.some((key) => key !== 'prompt')) {
    return { ok: false, status: 400, error: 'client_context_not_allowed' }
  }

  if (typeof record.prompt !== 'string') {
    return { ok: false, status: 400, error: 'prompt_required' }
  }

  const prompt = record.prompt.trim()
  if (!prompt || prompt.length > 2000) {
    return { ok: false, status: 400, error: 'invalid_prompt' }
  }

  return { ok: true, prompt }
}

function lessonRecordSurfaceFromRequest(request: Request): LessonReflectionSurface | null {
  const current = new URL(request.url)
  const referer = request.headers.get('referer')

  if (referer) {
    try {
      const refererUrl = new URL(referer)
      if (refererUrl.origin === current.origin) {
        const surface = lessonRecordSurfaceFromUrl(refererUrl)
        if (surface) return surface
      }
    } catch {
      // Fall through to the explicit same-origin surface locator.
    }
  }

  const relativeSurface = request.headers.get(LESSON_SURFACE_HEADER)
  if (!relativeSurface || !relativeSurface.startsWith('/') || relativeSurface.startsWith('//')) return null

  try {
    const surfaceUrl = new URL(relativeSurface, current.origin)
    if (surfaceUrl.origin !== current.origin) return null
    return lessonRecordSurfaceFromUrl(surfaceUrl)
  } catch {
    return null
  }
}

function lessonRecordSurfaceFromUrl(surfaceUrl: URL): LessonReflectionSurface | null {
  if (surfaceUrl.searchParams.get('mode') !== 'record') return null

  const match = surfaceUrl.pathname.match(/^\/classi\/([^/]+)\/lezioni\/([^/]+)$/)
  if (!match) return null

  try {
    const sectionId = decodeURIComponent(match[1]).trim()
    const blockId = decodeURIComponent(match[2]).trim().toUpperCase()
    if (!sectionId || !/^[A-Z0-9-]+$/.test(blockId)) return null
    return { sectionId, blockId }
  } catch {
    return null
  }
}

function privateJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}
