'use client'

import type { DictationAdapter } from '@assistant-ui/react'

const DEFAULT_MAX_CAPTURE_MS = 30_000
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096

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
    const pcmChunks: Float32Array[] = []

    let audioContext: AudioContext | null = null
    let sourceNode: MediaStreamAudioSourceNode | null = null
    let processorNode: ScriptProcessorNode | null = null
    let silenceGain: GainNode | null = null
    let stream: MediaStream | null = null
    let sampleRate = 48_000
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    let stopRequested = false
    let finishing = false
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
        await stopCompleted
        return
      }
      finishing = true
      clearCaptureTimer()

      const pcm = mergeFloat32Chunks(pcmChunks)
      await cleanupAudioGraph()

      if (cancelled || !sendForTranscription) {
        settleStop()
        return
      }

      try {
        if (pcm.length === 0) throw new Error('voice-capture-empty')

        const audio = encodeMonoPcmWav(pcm, sampleRate)
        const body = new FormData()
        body.append('audio', audio, 'dictation.wav')

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

    const session: DictationAdapter.Session = {
      status: { type: 'starting' },

      stop: async () => {
        stopRequested = true
        await finishCapture(true)
        await stopCompleted
      },

      cancel: () => {
        cancelled = true
        abortController.abort()
        clearCaptureTimer()
        session.status = { type: 'ended', reason: 'cancelled' }
        void cleanupAudioGraph()
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
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('voice-capture-not-supported')

        const AudioContextCtor = audioContextConstructor()
        if (!AudioContextCtor) throw new Error('voice-capture-not-supported')

        const context = new AudioContextCtor()
        audioContext = context
        if (context.state === 'suspended') await context.resume()

        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        })
        if (cancelled) {
          await cleanupAudioGraph()
          settleStop()
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

        session.status = { type: 'running' }
        for (const callback of speechStart) callback()

        timer = setTimeout(() => {
          void finishCapture(true)
        }, Math.max(1_000, Math.min(this.maxCaptureMs, DEFAULT_MAX_CAPTURE_MS)))

        if (stopRequested) await finishCapture(true)
      } catch {
        clearCaptureTimer()
        await cleanupAudioGraph()
        session.status = { type: 'ended', reason: 'error' }
        settleStop()
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
