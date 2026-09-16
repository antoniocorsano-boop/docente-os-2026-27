import { NextResponse } from 'next/server'
import {
  loadLessonReflectionCopilotContext,
  type LessonReflectionSurface,
} from '@/app/api/copilot/lesson-reflection-context-loader'
import { OpenAiSpeechToText } from '@/core/infrastructure/ai/openai-speech-to-text'
import { inspectFreeTextForPilot, pilotPrivacyErrorMessage } from '@/core/privacy/anonymization-guard'
import {
  isAllowedVoiceMimeType,
  normalizeVoiceMimeType,
  VOICE_CAPTURE_MAX_BYTES,
  VOICE_CAPTURE_MAX_DURATION_MS,
} from '@/core/presentation/voice-capture-contract'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const LESSON_SURFACE_HEADER = 'x-docente-surface-path'
const provider = new OpenAiSpeechToText()

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
  if (!provider.available) {
    return privateJson({
      error: 'voice_provider_unavailable',
      message: 'La dettatura non è disponibile in questo momento. Puoi continuare a scrivere la nota.',
    }, 503)
  }

  const parsed = await readVoiceRequest(request)
  if (!parsed.ok) return privateJson({ error: parsed.error, message: parsed.message }, parsed.status)

  try {
    const result = await provider.transcribe({
      audio: parsed.audio,
      filename: filenameForMimeType(parsed.mimeType),
      mimeType: parsed.mimeType,
      language: 'it',
    })

    const privacy = inspectFreeTextForPilot(result.text)
    if (!privacy.allowed) {
      return privateJson({
        error: 'voice_privacy_blocked',
        message: pilotPrivacyErrorMessage(privacy) ?? 'La trascrizione contiene dati non ammessi nel pilot.',
      }, 422)
    }

    return privateJson({
      text: result.text,
      ephemeral: true,
    })
  } catch {
    return privateJson({
      error: 'voice_transcription_failed',
      message: 'Non sono riuscito a trascrivere. Puoi riprovare o scrivere la nota.',
    }, 502)
  }
}

async function readVoiceRequest(request: Request): Promise<
  | { ok: true; audio: File; durationMs: number; mimeType: string }
  | { ok: false; status: number; error: string; message: string }
> {
  const form = await request.formData().catch(() => null)
  if (!form) {
    return { ok: false, status: 400, error: 'invalid_voice_request', message: 'Dati audio non validi.' }
  }

  const keys = [...form.keys()]
  if (keys.some((key) => key !== 'audio' && key !== 'durationMs')) {
    return { ok: false, status: 400, error: 'client_context_not_allowed', message: 'La richiesta voce contiene dati non previsti.' }
  }

  const audio = form.get('audio')
  const durationRaw = form.get('durationMs')
  if (!(audio instanceof File) || typeof durationRaw !== 'string') {
    return { ok: false, status: 400, error: 'audio_required', message: 'Audio non disponibile.' }
  }

  const durationMs = Number(durationRaw)
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > VOICE_CAPTURE_MAX_DURATION_MS) {
    return { ok: false, status: 413, error: 'audio_duration_invalid', message: 'La dettatura può durare al massimo 90 secondi.' }
  }
  if (audio.size <= 0 || audio.size > VOICE_CAPTURE_MAX_BYTES) {
    return { ok: false, status: 413, error: 'audio_size_invalid', message: 'La registrazione audio è troppo grande.' }
  }

  const mimeType = normalizeVoiceMimeType(audio.type)
  if (!isAllowedVoiceMimeType(mimeType)) {
    return { ok: false, status: 415, error: 'audio_type_unsupported', message: 'Formato audio non supportato.' }
  }

  return { ok: true, audio, durationMs, mimeType }
}

function filenameForMimeType(mimeType: string) {
  if (mimeType === 'audio/mp4') return 'lesson-note.m4a'
  if (mimeType === 'audio/ogg') return 'lesson-note.ogg'
  if (mimeType === 'audio/mpeg') return 'lesson-note.mp3'
  if (mimeType === 'audio/wav') return 'lesson-note.wav'
  return 'lesson-note.webm'
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
