import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { loadCurrentTodayCopilotContext } from '@/app/api/assistant/today-context-loader'
import { assembleNextLessonPreparationCopilotContext } from '@/core/application/copilot/copilot-context-assembler'
import {
  handleNextLessonPreparation,
  matchesNextLessonPreparationIntent,
} from '@/core/application/copilot/next-lesson-preparation-handler'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await readRequest(request)
  if (!body.ok) return privateJson({ error: body.error }, body.status)

  if (!matchesNextLessonPreparationIntent(body.prompt)) {
    return privateJson({
      error: 'unsupported_intent',
      message: 'La frontdoor Copilot non dispone ancora di un handler autorizzato per questa richiesta.',
      supportedSkills: ['NEXT_LESSON_PREPARATION'],
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

function privateJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  })
}
