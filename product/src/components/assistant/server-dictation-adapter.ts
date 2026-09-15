'use client'

import type { DictationAdapter } from '@assistant-ui/react'

const DEFAULT_MAX_CAPTURE_MS = 90_000
const RECORDER_TIMESLICE_MS = 250
const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
] as const
const DIAGNOSTIC_ENDPOINT = '/api/assistant/voice-diagnostic'

type VoiceDiagnosticEvent =
  | 'listen-called'
  | 'stream-ready'
  | 'track-mute'
  | 'track-unmute'
  | 'track-ended'
  | 'recorder-start'
  | 'recorder-stop'
  | 'recorder-autostop'
  | 'recorder-error'
  | 'session-stop-called'
  | 'session-cancel-called'
  | 'safety-timeout'
  | 'page-hidden'
  | 'page-visible'
  | 'transcribe-start'
  | 'transcribe-response'

type StopCause = 'user' | 'cancel' | 'safety' | null

export class ServerDictationAdapter implements DictationAdapter {
  readonly disableInputDuringDictation = true

  constructor(
    private readonly endpoint = '/api/assistant/transcribe',
    private readonly maxCaptureMs = DEFAULT_MAX_CAPTURE_MS,
  ) {}

  listen(): DictationAdapter.Session {
    const speechStart = new Set<() => void>()
    const speechEnd = new Set<(result: DictationAdapter.Result) => void>()
    const speech = new Set<(result: DictationAdapter.Result) => void>()
    const chunks: Blob[] = []
    const startedAt = performance.now()

    let recorder: MediaRecorder | null = null
    let stream: MediaStream | null = null
    let cancelled = false
    let stopRequested = false
    let stopCause: StopCause = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let settled = false
    let resolveStopped: (() => void) | null = null
    let intentionalTrackStop = false
    let visibilityListenerAttached = false

    const diagnostic = (event: VoiceDiagnosticEvent, statusCode?: number) => {
      reportVoiceDiagnostic({
        event,
        elapsedMs: performance.now() - startedAt,
        recorderState: recorder?.state ?? null,
        trackState: stream?.getAudioTracks()[0]?.readyState ?? null,
        visibility: document.visibilityState,
        statusCode,
      })
    }

    diagnostic('listen-called')

    const stopped = new Promise<void>((resolve) => {
      resolveStopped = resolve
    })

    const clearTimer = () => {
      if (timer) clearTimeout(timer)
      timer = null
    }

    const onVisibilityChange = () => {
      diagnostic(document.visibilityState === 'hidden' ? 'page-hidden' : 'page-visible')
    }

    const detachVisibilityListener = () => {
      if (!visibilityListenerAttached) return
      document.removeEventListener('visibilitychange', onVisibilityChange)
      visibilityListenerAttached = false
    }

    const stopRecorder = () => {
      if (!recorder || recorder.state === 'inactive') return
      try {
        recorder.requestData()
      } catch {
        // Some mobile browsers reject requestData during a pending state change.
      }
      recorder.stop()
    }

    const stopTracks = () => {
      intentionalTrackStop = true
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
    }

    const settle = () => {
      if (settled) return
      settled = true
      detachVisibilityListener()
      resolveStopped?.()
    }

    const session: DictationAdapter.Session = {
      status: { type: 'starting' },

      stop: async () => {
        diagnostic('session-stop-called')
        stopRequested = true
        stopCause = stopCause ?? 'user'
        clearTimer()
        stopRecorder()
        await stopped
      },

      cancel: () => {
        diagnostic('session-cancel-called')
        cancelled = true
        stopCause = 'cancel'
        clearTimer()
        stopRecorder()
        stopTracks()
        session.status = { type: 'ended', reason: 'cancelled' }
        settle()
      },

      onSpeechStart: (callback) => {
        speechStart.add(callback)
        return () => speechStart.delete(callback)
      },
      onSpeechEnd: (callback) => {
        speechEnd.add(callback)
        return () => speechEnd.delete(callback)
      },
      onSpeech: (callback) => {
        speech.add(callback)
        return () => speech.delete(callback)
      },
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    visibilityListenerAttached = true

    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
          throw new Error('voice-capture-not-supported')
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })

        diagnostic('stream-ready')

        const track = stream.getAudioTracks()[0]
        if (track) {
          track.addEventListener('mute', () => diagnostic('track-mute'))
          track.addEventListener('unmute', () => diagnostic('track-unmute'))
          track.addEventListener('ended', () => {
            if (!intentionalTrackStop) diagnostic('track-ended')
          })
        }

        if (cancelled) {
          stopTracks()
          settle()
          return
        }

        const preferredMimeType = preferredRecorderMimeType()
        recorder = preferredMimeType
          ? new MediaRecorder(stream, { mimeType: preferredMimeType })
          : new MediaRecorder(stream)

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }

        recorder.onstart = () => {
          diagnostic('recorder-start')
          session.status = { type: 'running' }
          for (const callback of speechStart) callback()

          timer = setTimeout(() => {
            stopCause = 'safety'
            diagnostic('safety-timeout')
            stopRecorder()
          }, Math.max(1_000, Math.min(this.maxCaptureMs, DEFAULT_MAX_CAPTURE_MS)))

          if (stopRequested) stopRecorder()
        }

        recorder.onerror = () => {
          diagnostic('recorder-error')
          clearTimer()
          stopTracks()
          session.status = { type: 'ended', reason: 'error' }
          settle()
        }

        recorder.onstop = async () => {
          if (!cancelled && stopCause === null) diagnostic('recorder-autostop')
          diagnostic('recorder-stop')
          clearTimer()
          stopTracks()

          if (cancelled) {
            settle()
            return
          }

          try {
            const mimeType = recorder?.mimeType || preferredMimeType || 'audio/webm'
            const audio = new Blob(chunks, { type: mimeType })
            if (audio.size === 0) throw new Error('voice-capture-empty')

            const body = new FormData()
            body.append('audio', audio, `dictation.${extensionForMimeType(mimeType)}`)
            diagnostic('transcribe-start')

            const response = await fetch(this.endpoint, {
              method: 'POST',
              cache: 'no-store',
              body,
            })
            diagnostic('transcribe-response', response.status)
            if (!response.ok) throw new Error(`voice-transcription-${response.status}`)

            const payload = await response.json() as { text?: unknown }
            const transcript = typeof payload.text === 'string' ? payload.text.replace(/\s+/g, ' ').trim() : ''
            if (!transcript) throw new Error('voice-transcription-empty')

            const result: DictationAdapter.Result = { transcript, isFinal: true }
            for (const callback of speech) callback(result)
            for (const callback of speechEnd) callback(result)
            session.status = { type: 'ended', reason: 'stopped' }
          } catch {
            session.status = { type: 'ended', reason: 'error' }
          } finally {
            settle()
          }
        }

        recorder.start(RECORDER_TIMESLICE_MS)
        if (stopRequested && recorder.state !== 'inactive') stopRecorder()
      } catch {
        clearTimer()
        stopTracks()
        session.status = { type: 'ended', reason: 'error' }
        settle()
      }
    })()

    return session
  }
}

function preferredRecorderMimeType() {
  if (typeof MediaRecorder.isTypeSupported !== 'function') return undefined
  return RECORDER_MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate))
}

function reportVoiceDiagnostic(input: {
  event: VoiceDiagnosticEvent
  elapsedMs: number
  recorderState: RecordingState | null
  trackState: MediaStreamTrackState | null
  visibility: DocumentVisibilityState
  statusCode?: number
}) {
  const payload = JSON.stringify({
    event: input.event,
    elapsedMs: Math.round(input.elapsedMs),
    recorderState: input.recorderState,
    trackState: input.trackState,
    visibility: input.visibility,
    statusCode: input.statusCode,
  })

  void fetch(DIAGNOSTIC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: payload,
    keepalive: true,
  }).catch(() => {
    try {
      navigator.sendBeacon?.(DIAGNOSTIC_ENDPOINT, new Blob([payload], { type: 'application/json' }))
    } catch {}
  })
}

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}
