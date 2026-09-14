'use client'

import type { DictationAdapter } from '@assistant-ui/react'

const DEFAULT_MAX_CAPTURE_MS = 30_000

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
    const abortController = new AbortController()
    const chunks: BlobPart[] = []

    let mediaRecorder: MediaRecorder | null = null
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    let stopRequested = false

    const clearCaptureTimer = () => {
      if (timer) clearTimeout(timer)
      timer = null
    }

    const stopTracks = () => {
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
    }

    const session: DictationAdapter.Session = {
      status: { type: 'starting' },

      stop: async () => {
        stopRequested = true
        clearCaptureTimer()
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
      },

      cancel: () => {
        cancelled = true
        abortController.abort()
        clearCaptureTimer()
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
        stopTracks()
        session.status = { type: 'ended', reason: 'cancelled' }
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

        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) {
          stopTracks()
          return
        }

        mediaRecorder = new MediaRecorder(stream)
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }
        mediaRecorder.onstart = () => {
          session.status = { type: 'running' }
          for (const callback of speechStart) callback()
          timer = setTimeout(() => {
            if (mediaRecorder?.state !== 'inactive') mediaRecorder?.stop()
          }, Math.max(1_000, Math.min(this.maxCaptureMs, DEFAULT_MAX_CAPTURE_MS)))
          if (stopRequested && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
        }
        mediaRecorder.onstop = async () => {
          clearCaptureTimer()
          stopTracks()
          if (cancelled) return

          try {
            const mimeType = mediaRecorder?.mimeType || 'audio/webm'
            const audio = new Blob(chunks, { type: mimeType })
            if (audio.size === 0) throw new Error('voice-capture-empty')

            const body = new FormData()
            body.append('audio', audio, dictationFilename(mimeType))
            const response = await fetch(this.endpoint, {
              method: 'POST',
              cache: 'no-store',
              body,
              signal: abortController.signal,
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
          }
        }

        mediaRecorder.start()
      } catch {
        clearCaptureTimer()
        stopTracks()
        session.status = { type: 'ended', reason: 'error' }
      }
    })()

    return session
  }
}

function dictationFilename(mimeType: string) {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'dictation.m4a'
  if (mimeType.includes('ogg')) return 'dictation.ogg'
  return 'dictation.webm'
}
