'use client'

import type { DictationAdapter } from '@assistant-ui/react'

const DEFAULT_MAX_CAPTURE_MS = 30_000
const RECORDER_TIMESLICE_MS = 250
const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
] as const

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
    const chunks: Blob[] = []

    let mediaRecorder: MediaRecorder | null = null
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    let stopRequested = false
    let stopSettled = false
    let resolveStop: (() => void) | null = null
    const stopCompleted = new Promise<void>((resolve) => {
      resolveStop = resolve
    })

    const clearCaptureTimer = () => {
      if (timer) clearTimeout(timer)
      timer = null
    }

    const stopTracks = () => {
      stream?.getTracks().forEach((track) => track.stop())
      stream = null
    }

    const settleStop = () => {
      if (stopSettled) return
      stopSettled = true
      resolveStop?.()
    }

    const stopRecorder = () => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') return
      try {
        mediaRecorder.requestData()
      } catch {
        // Some browsers do not allow requestData() during a pending state change.
      }
      mediaRecorder.stop()
    }

    const session: DictationAdapter.Session = {
      status: { type: 'starting' },

      stop: async () => {
        stopRequested = true
        clearCaptureTimer()
        stopRecorder()
        await stopCompleted
      },

      cancel: () => {
        cancelled = true
        abortController.abort()
        clearCaptureTimer()
        stopRecorder()
        stopTracks()
        session.status = { type: 'ended', reason: 'cancelled' }
        settleStop()
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
          },
        })
        if (cancelled) {
          stopTracks()
          settleStop()
          return
        }

        const mimeType = preferredRecorderMimeType()
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream)
        mediaRecorder = recorder

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }
        recorder.onstart = () => {
          session.status = { type: 'running' }
          for (const callback of speechStart) callback()
          timer = setTimeout(() => {
            stopRecorder()
          }, Math.max(1_000, Math.min(this.maxCaptureMs, DEFAULT_MAX_CAPTURE_MS)))
          if (stopRequested) stopRecorder()
        }
        recorder.onstop = async () => {
          clearCaptureTimer()
          stopTracks()
          if (cancelled) {
            settleStop()
            return
          }

          try {
            const recordedMimeType = recorder.mimeType || mimeType || 'audio/webm'
            const audio = new Blob(chunks, { type: recordedMimeType })
            if (audio.size === 0) throw new Error('voice-capture-empty')

            const body = new FormData()
            body.append('audio', audio, dictationFilename(recordedMimeType))
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
          } finally {
            settleStop()
          }
        }

        recorder.start(RECORDER_TIMESLICE_MS)
      } catch {
        clearCaptureTimer()
        stopTracks()
        session.status = { type: 'ended', reason: 'error' }
        settleStop()
      }
    })()

    return session
  }
}

function preferredRecorderMimeType() {
  if (typeof MediaRecorder.isTypeSupported !== 'function') return undefined
  return RECORDER_MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate))
}

function dictationFilename(mimeType: string) {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'dictation.m4a'
  if (mimeType.includes('ogg')) return 'dictation.ogg'
  return 'dictation.webm'
}
