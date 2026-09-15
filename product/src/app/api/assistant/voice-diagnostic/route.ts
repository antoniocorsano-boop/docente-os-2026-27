import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED_EVENTS = new Set([
  'listen-called',
  'stream-ready',
  'track-mute',
  'track-unmute',
  'track-ended',
  'recorder-start',
  'recorder-stop',
  'recorder-autostop',
  'recorder-error',
  'session-stop-called',
  'session-cancel-called',
  'safety-timeout',
  'page-hidden',
  'page-visible',
  'transcribe-start',
  'transcribe-response',
])

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return new NextResponse(null, { status: 403 })

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const input = payload as Record<string, unknown>
  const event = typeof input.event === 'string' ? input.event : ''
  if (!ALLOWED_EVENTS.has(event)) return new NextResponse(null, { status: 400 })

  const elapsedMs = typeof input.elapsedMs === 'number' && Number.isFinite(input.elapsedMs)
    ? Math.max(0, Math.min(120_000, Math.round(input.elapsedMs)))
    : null
  const recorderState = input.recorderState === 'inactive' || input.recorderState === 'recording' || input.recorderState === 'paused'
    ? input.recorderState
    : null
  const trackState = input.trackState === 'live' || input.trackState === 'ended' ? input.trackState : null
  const visibility = input.visibility === 'visible' || input.visibility === 'hidden' ? input.visibility : null
  const statusCode = typeof input.statusCode === 'number' && Number.isInteger(input.statusCode)
    ? Math.max(100, Math.min(599, input.statusCode))
    : null

  console.info('[DOCENTE OS][voice-diagnostic]', JSON.stringify({
    event,
    elapsedMs,
    recorderState,
    trackState,
    visibility,
    statusCode,
  }))

  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'private, no-store' },
  })
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
