import { NextResponse } from 'next/server'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export const dynamic = 'force-dynamic'

const MAX_AUDIO_BYTES = 8 * 1024 * 1024
const TRANSCRIPTION_TIMEOUT_MS = 20_000
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mpeg',
  'audio/wav',
])

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 })
  }

  if (process.env.DOCENTE_OS_VOICE_CAPTURE === 'off') {
    return NextResponse.json({ error: 'voice_capture_disabled' }, { status: 404 })
  }

  const current = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!current) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'transcription_provider_unavailable' }, { status: 503 })

  const formData = await request.formData()
  const audio = formData.get('audio')
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: 'audio_required' }, { status: 400 })
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'invalid_audio_size' }, { status: 413 })
  }

  const mediaType = normalizeMediaType(audio.type)
  if (!ALLOWED_AUDIO_TYPES.has(mediaType)) {
    return NextResponse.json({ error: 'unsupported_audio_type' }, { status: 415 })
  }

  const providerBody = new FormData()
  providerBody.append('file', audio, providerFilename(mediaType))
  providerBody.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL ?? 'gpt-4o-mini-transcribe')
  providerBody.append('language', 'it')

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: providerBody,
      signal: AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS),
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'transcription_provider_failed' }, { status: 502 })
    }

    const payload = await response.json() as { text?: unknown }
    const text = typeof payload.text === 'string' ? payload.text.replace(/\s+/g, ' ').trim() : ''
    if (!text) return NextResponse.json({ error: 'empty_transcript' }, { status: 502 })

    return NextResponse.json({ text }, {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'transcription_unavailable' }, { status: 504 })
  }
}

function normalizeMediaType(value: string) {
  return value.split(';', 1)[0]?.trim().toLowerCase() || 'application/octet-stream'
}

function providerFilename(mediaType: string) {
  if (mediaType.includes('mp4') || mediaType.includes('m4a')) return 'dictation.m4a'
  if (mediaType.includes('ogg')) return 'dictation.ogg'
  if (mediaType.includes('mpeg')) return 'dictation.mp3'
  if (mediaType.includes('wav')) return 'dictation.wav'
  return 'dictation.webm'
}

function sameOriginRequest(request: Request) {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false

  const origin = request.headers.get('origin')
  if (!origin) return true

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}
