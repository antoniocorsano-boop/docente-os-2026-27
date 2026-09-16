import { NextResponse } from 'next/server'
import { lessonRecordSurfaceFromRequest } from '@/app/api/copilot/lesson-record-surface'
import { loadLessonReflectionCopilotContext } from '@/app/api/copilot/lesson-reflection-context-loader'
import {
  SPEECH_TO_TEXT_ALLOWED_MIME_TYPES,
  SPEECH_TO_TEXT_MAX_BYTES,
} from '@/core/application/speech/speech-to-text-port'
import { OpenAiSpeechToText } from '@/core/infrastructure/ai/openai-speech-to-text'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const surface = lessonRecordSurfaceFromRequest(request)
  if (!surface) {
    return privateJson({
      error: 'lesson_context_unavailable',
      message: 'La dettatura è disponibile soltanto dalla registrazione della lezione corrente.',
    }, 409)
  }

  const loaded = await loadLessonReflectionCopilotContext(surface)
  if (loaded.status === 'UNAUTHORIZED') return privateJson({ error: 'unauthorized' }, 401)
  if (loaded.status === 'BLOCKED') {
    return privateJson({ error: 'lesson_context_blocked', message: loaded.message }, 409)
  }

  const form = await request.formData().catch(() => null)
  if (!form) return privateJson({ error: 'invalid_audio_request' }, 400)

  const keys = [...form.keys()]
  if (keys.some((key) => key !== 'audio')) {
    return privateJson({ error: 'client_context_not_allowed' }, 400)
  }

  const audio = form.get('audio')
  if (!(audio instanceof File)) return privateJson({ error: 'audio_required' }, 400)
  if (audio.size <= 0) return privateJson({ error: 'audio_empty' }, 400)
  if (audio.size > SPEECH_TO_TEXT_MAX_BYTES) {
    return privateJson({
      error: 'audio_too_large',
      message: 'La dettatura è troppo lunga. Interrompi prima e riprova con una nota più breve.',
    }, 413)
  }

  const mimeType = normalizeMimeType(audio.type)
  if (!SPEECH_TO_TEXT_ALLOWED_MIME_TYPES.has(mimeType)) {
    return privateJson({ error: 'audio_type_not_supported' }, 415)
  }

  const provider = new OpenAiSpeechToText()
  if (!provider.available) {
    return privateJson({
      error: 'speech_provider_unavailable',
      message: 'La dettatura non è disponibile in questo momento. Puoi continuare a scrivere la nota manualmente.',
    }, 503)
  }

  try {
    const result = await provider.transcribe({
      bytes: new Uint8Array(await audio.arrayBuffer()),
      mimeType,
      filename: `lesson-note.${extensionForMimeType(mimeType)}`,
      language: 'it',
    })

    return privateJson({
      transcript: result.transcript,
      sourceKind: 'EPHEMERAL_TRANSCRIPT',
    })
  } catch {
    return privateJson({
      error: 'speech_transcription_failed',
      message: 'Non sono riuscito a trascrivere la nota. Il percorso manuale resta disponibile.',
    }, 502)
  }
}

function normalizeMimeType(value: string) {
  return value.toLocaleLowerCase('en-US').split(';', 1)[0].trim()
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case 'audio/ogg': return 'ogg'
    case 'audio/wav': return 'wav'
    case 'audio/mpeg': return 'mp3'
    case 'audio/mp4': return 'mp4'
    case 'audio/x-m4a': return 'm4a'
    default: return 'webm'
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
