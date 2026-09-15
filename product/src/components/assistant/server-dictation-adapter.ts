'use client'

import type { DictationAdapter } from '@assistant-ui/react'

const DEFAULT_MAX_CAPTURE_MS = 90_000

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
    const chunks: BlobPart[] = []

    let recorder: MediaRecorder | null = null
    let stream: MediaStream | null = null
    let cancelled = false
    let stopRequested = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let settled = false
    let resolveStopped: (() => void) | null = null

    const stopped = new Promise<void>((resolve) => {
      resolveStopped = resolve
    })

    const clearTimer = () => {
      if (timer) clearTimeout(timer)
      timer = null
    }

    const stopTracks = () => {
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
    }

    const settle = () => {
      if (settled) return
      settled = true
      resolveStopped?.()
    }

    const session: DictationAdapter.Session = {
      status: { type: 'starting' },

      stop: async () => {
        stopRequested = true
        if (recorder && recorder.state !== 'inactive') recorder.stop()
        await stopped
      },

      cancel: () => {
        cancelled = true
        clearTimer()
        if (recorder && recorder.state !== 'inactive') recorder.stop()
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
            channelCount: 1,
          },
        })

        if (cancelled) {
          stopTracks()
          settle()
          return
        }

        recorder = new MediaRecorder(stream)

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }

        recorder.onstart = () => {
          session.status = { type: 'running' }
          for (const callback of speechStart) callback()

          timer = setTimeout(() => {
            if (recorder && recorder.state !== 'inactive') recorder.stop()
          }, Math.max(1_000, Math.min(this.maxCaptureMs, DEFAULT_MAX_CAPTURE_MS)))
        }

        recorder.onerror = () => {
          clearTimer()
          stopTracks()
          session.status = { type: 'ended', reason: 'error' }
          settle()
        }

        recorder.onstop = async () => {
          clearTimer()
          stopTracks()

          if (cancelled) {
            settle()
            return
          }

          try {
            const mimeType = recorder?.mimeType || 'audio/webm'
            const audio = new Blob(chunks, { type: mimeType })
            if (audio.size === 0) throw new Error('voice-capture-empty')

            const body = new FormData()
            body.append('audio', audio, `dictation.${extensionForMimeType(mimeType)}`)

            const response = await fetch(this.endpoint, {
              method: 'POST',
              cache: 'no-store',
              body,
            })
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

        recorder.start()
        if (stopRequested && recorder.state !== 'inactive') recorder.stop()
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

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}
