'use client'

import type { DictationAdapter } from '@assistant-ui/react'

const DEFAULT_MAX_CAPTURE_MS = 90_000
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096
const TRANSCRIPTION_SAMPLE_RATE = 16_000
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
    const pcmChunks: Float32Array[] = []
    const abortController = new AbortController()
    const startedAt = performance.now()

    let audioContext: AudioContext | null = null
    let sourceNode: MediaStreamAudioSourceNode | null = null
    let processorNode: ScriptProcessorNode | null = null
    let silenceGain: GainNode | null = null
    let stream: MediaStream | null = null
    let sampleRate = 48_000
    let cancelled = false
    let stopRequested = false
    let finishing = false
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let resolveStopped: (() => void) | null = null
    let intentionalTrackStop = false
    let visibilityListenerAttached = false

    const diagnostic = (event: VoiceDiagnosticEvent, statusCode?: number) => {
      reportVoiceDiagnostic({
        event,
        elapsedMs: performance.now() - startedAt,
        recorderState: null,
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

    const cleanupAudioGraph = async () => {
      if (processorNode) {
        processorNode.onaudioprocess = null
        try { processorNode.disconnect() } catch {}
        processorNode = null
      }
      if (sourceNode) {
        try { sourceNode.disconnect() } catch {}
        sourceNode = null
      }
      if (silenceGain) {
        try { silenceGain.disconnect() } catch {}
        silenceGain = null
      }
      stopTracks()
      if (audioContext) {
        const current = audioContext
        audioContext = null
        try {
          if (current.state !== 'closed') await current.close()
        } catch {}
      }
    }

    const finishCapture = async (sendForTranscription: boolean) => {
      if (finishing) {
        await stopped
        return
      }
      finishing = true
      clearTimer()
      diagnostic('recorder-stop')

      const pcm = mergeFloat32Chunks(pcmChunks)
      await cleanupAudioGraph()

      if (cancelled || !sendForTranscription) {
        settle()
        return
      }

      try {
        if (pcm.length === 0) throw new Error('voice-capture-empty')

        const normalized = downsamplePcm(pcm, sampleRate, TRANSCRIPTION_SAMPLE_RATE)
        const audio = encodeMonoPcmWav(normalized, TRANSCRIPTION_SAMPLE_RATE)
        const body = new FormData()
        body.append('audio', audio, 'dictation.wav')
        diagnostic('transcribe-start')

        const response = await fetch(this.endpoint, {
          method: 'POST',
          cache: 'no-store',
          body,
          signal: abortController.signal,
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

    const resumeAudioContext = async () => {
      const context = audioContext
      if (!context || context.state !== 'suspended' || cancelled || finishing) return
      try {
        await context.resume()
      } catch {
        diagnostic('recorder-error')
      }
    }

    const onVisibilityChange = () => {
      const visible = document.visibilityState === 'visible'
      diagnostic(visible ? 'page-visible' : 'page-hidden')
      if (visible) void resumeAudioContext()
    }

    const detachVisibilityListener = () => {
      if (!visibilityListenerAttached) return
      document.removeEventListener('visibilitychange', onVisibilityChange)
      visibilityListenerAttached = false
    }

    const session: DictationAdapter.Session = {
      status: { type: 'starting' },

      stop: async () => {
        diagnostic('session-stop-called')
        stopRequested = true
        await finishCapture(true)
        await stopped
      },

      cancel: () => {
        diagnostic('session-cancel-called')
        cancelled = true
        abortController.abort()
        clearTimer()
        session.status = { type: 'ended', reason: 'cancelled' }
        void cleanupAudioGraph().finally(settle)
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
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('voice-capture-not-supported')

        const AudioContextCtor = audioContextConstructor()
        if (!AudioContextCtor) throw new Error('voice-audio-context-unavailable')

        const context = new AudioContextCtor()
        audioContext = context
        if (context.state === 'suspended') await context.resume()

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
          await cleanupAudioGraph()
          settle()
          return
        }

        sampleRate = context.sampleRate
        sourceNode = context.createMediaStreamSource(stream)
        processorNode = context.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, 1, 1)
        silenceGain = context.createGain()
        silenceGain.gain.value = 0

        processorNode.onaudioprocess = (event) => {
          if (cancelled || finishing || event.inputBuffer.numberOfChannels === 0) return
          pcmChunks.push(new Float32Array(event.inputBuffer.getChannelData(0)))
        }

        sourceNode.connect(processorNode)
        processorNode.connect(silenceGain)
        silenceGain.connect(context.destination)

        if (context.state === 'suspended') await context.resume()
        context.addEventListener('statechange', () => {
          if (context.state === 'suspended' && document.visibilityState === 'visible') {
            void resumeAudioContext()
          }
        })

        diagnostic('recorder-start')
        session.status = { type: 'running' }
        for (const callback of speechStart) callback()

        timer = setTimeout(() => {
          diagnostic('safety-timeout')
          void finishCapture(true)
        }, Math.max(1_000, Math.min(this.maxCaptureMs, DEFAULT_MAX_CAPTURE_MS)))

        if (stopRequested) await finishCapture(true)
      } catch {
        clearTimer()
        await cleanupAudioGraph()
        session.status = { type: 'ended', reason: 'error' }
        settle()
      }
    })()

    return session
  }
}

function audioContextConstructor() {
  if (typeof window === 'undefined') return undefined
  if (typeof AudioContext !== 'undefined') return AudioContext
  return (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
}

function mergeFloat32Chunks(chunks: readonly Float32Array[]) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const merged = new Float32Array(length)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged
}

function downsamplePcm(samples: Float32Array, sourceRate: number, targetRate: number) {
  if (sourceRate <= targetRate) return samples

  const ratio = sourceRate / targetRate
  const outputLength = Math.max(1, Math.floor(samples.length / ratio))
  const output = new Float32Array(outputLength)

  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const start = Math.floor(outputIndex * ratio)
    const end = Math.min(samples.length, Math.floor((outputIndex + 1) * ratio))
    let sum = 0
    let count = 0
    for (let inputIndex = start; inputIndex < end; inputIndex += 1) {
      sum += samples[inputIndex] ?? 0
      count += 1
    }
    output[outputIndex] = count > 0 ? sum / count : samples[start] ?? 0
  }

  return output
}

function encodeMonoPcmWav(samples: Float32Array, sampleRate: number) {
  const bytesPerSample = 2
  const dataLength = samples.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  let offset = 44
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += bytesPerSample
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
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
