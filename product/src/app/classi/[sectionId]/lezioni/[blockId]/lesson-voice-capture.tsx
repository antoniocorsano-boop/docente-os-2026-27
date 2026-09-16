'use client'

import { Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  isAllowedVoiceMimeType,
  normalizeVoiceMimeType,
  VOICE_CAPTURE_MAX_BYTES,
  VOICE_CAPTURE_MAX_DURATION_MS,
} from '@/core/presentation/voice-capture-contract'
import styles from './lesson-live.module.css'

type VoiceState = 'IDLE' | 'RECORDING' | 'TRANSCRIBING'

type VoiceResponse = {
  text?: string
  ephemeral?: boolean
  message?: string
}

export default function LessonVoiceCapture({
  disabled = false,
  surfacePath,
  onTranscript,
  onBusyChange,
}: {
  disabled?: boolean
  surfacePath?: string
  onTranscript: (text: string) => void
  onBusyChange?: (busy: boolean) => void
}) {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voiceInfo, setVoiceInfo] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const captureEpochRef = useRef(0)

  useEffect(() => {
    return () => {
      captureEpochRef.current += 1
      if (autoStopRef.current) clearTimeout(autoStopRef.current)
      autoStopRef.current = null

      const recorder = recorderRef.current
      recorderRef.current = null
      if (recorder?.state === 'recording') {
        recorder.ondataavailable = null
        recorder.onstart = null
        recorder.onstop = null
        recorder.stop()
      }

      const stream = streamRef.current
      streamRef.current = null
      stream?.getTracks().forEach((track) => track.stop())
      chunksRef.current = []
    }
  }, [])

  function transition(next: VoiceState) {
    setVoiceState(next)
    onBusyChange?.(next !== 'IDLE')
  }

  async function startCapture() {
    setVoiceError(null)
    setVoiceInfo(null)

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('Il microfono non è disponibile in questo browser. Puoi continuare a scrivere la nota.')
      return
    }

    const epoch = captureEpochRef.current + 1
    captureEpochRef.current = epoch

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      if (captureEpochRef.current !== epoch) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      chunksRef.current = []
      const mimeType = preferredMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstart = (event) => {
        startedAtRef.current = event.timeStamp
      }
      recorder.onstop = (event) => {
        void finalizeCapture(recorder.mimeType || mimeType || 'audio/webm', epoch, event.timeStamp)
      }

      recorder.start(500)
      transition('RECORDING')
      autoStopRef.current = setTimeout(() => {
        const current = recorderRef.current
        if (current?.state === 'recording') current.stop()
      }, VOICE_CAPTURE_MAX_DURATION_MS)
    } catch {
      releaseStream()
      if (captureEpochRef.current !== epoch) return
      transition('IDLE')
      setVoiceError('Non posso usare il microfono. Consenti l’accesso oppure continua con la tastiera.')
    }
  }

  function stopCapture() {
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
  }

  async function finalizeCapture(rawMimeType: string, epoch: number, stoppedAtMs: number) {
    clearAutoStop()
    releaseStream()
    recorderRef.current = null
    if (captureEpochRef.current !== epoch) return

    const durationMs = Math.max(
      1,
      Math.min(VOICE_CAPTURE_MAX_DURATION_MS, stoppedAtMs - startedAtRef.current),
    )
    const mimeType = normalizeVoiceMimeType(rawMimeType)
    if (!isAllowedVoiceMimeType(mimeType)) {
      chunksRef.current = []
      transition('IDLE')
      setVoiceError('Il formato audio prodotto dal browser non è supportato. Puoi continuare con la tastiera.')
      return
    }

    const audio = new Blob(chunksRef.current, { type: mimeType })
    chunksRef.current = []
    if (audio.size <= 0 || audio.size > VOICE_CAPTURE_MAX_BYTES) {
      transition('IDLE')
      setVoiceError('La registrazione audio non è utilizzabile. Puoi riprovare o scrivere la nota.')
      return
    }

    transition('TRANSCRIBING')
    setVoiceInfo('Trascrizione in corso…')
    try {
      const form = new FormData()
      form.append('audio', audio, filenameForMimeType(mimeType))
      form.append('durationMs', String(durationMs))

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: {
          'X-Docente-Surface-Path': surfacePath ?? `${window.location.pathname}${window.location.search}`,
        },
        body: form,
      })
      const payload = await response.json().catch(() => null) as VoiceResponse | null
      if (captureEpochRef.current !== epoch) return
      if (!response.ok || !payload?.text) {
        setVoiceError(payload?.message ?? 'Non sono riuscito a trascrivere. Puoi riprovare o scrivere la nota.')
        setVoiceInfo(null)
        return
      }

      onTranscript(payload.text)
      setVoiceInfo('Trascrizione pronta. Controllala e correggila prima di registrare.')
    } catch {
      if (captureEpochRef.current !== epoch) return
      setVoiceError('La trascrizione non è disponibile. La nota scritta resta invariata e puoi continuare manualmente.')
      setVoiceInfo(null)
    } finally {
      if (captureEpochRef.current === epoch) transition('IDLE')
    }
  }

  function clearAutoStop() {
    if (autoStopRef.current) clearTimeout(autoStopRef.current)
    autoStopRef.current = null
  }

  function releaseStream() {
    const stream = streamRef.current
    streamRef.current = null
    stream?.getTracks().forEach((track) => track.stop())
  }

  const recording = voiceState === 'RECORDING'
  const transcribing = voiceState === 'TRANSCRIBING'

  return (
    <section className={styles.voiceCapture} aria-label="Dettatura della nota di lezione">
      <div className={styles.voiceCaptureRow}>
        <button
          className={recording ? styles.voiceStop : styles.voiceAction}
          type="button"
          onClick={recording ? stopCapture : startCapture}
          disabled={disabled || transcribing}
          aria-pressed={recording}
        >
          {recording ? <Square aria-hidden="true" size={18} /> : <Mic aria-hidden="true" size={18} />}
          {recording ? 'Termina dettatura' : transcribing ? 'Trascrizione…' : 'Detta la lezione'}
        </button>
        <span aria-live="polite">
          {recording ? 'Sto ascoltando. Premi “Termina dettatura” quando hai finito.' : 'Il microfono compila la stessa nota: non registra direttamente la lezione.'}
        </span>
      </div>
      <p className={styles.privacyNote}>Audio effimero: viene usato solo per ottenere la trascrizione e non viene salvato. Nel pilot non dettare nomi o dati personali degli studenti.</p>
      {voiceInfo ? <p className={styles.voiceInfo} role="status">{voiceInfo}</p> : null}
      {voiceError ? <p className={styles.privacyNote} role="alert">{voiceError}</p> : null}
    </section>
  )
}

function preferredMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find((value) => MediaRecorder.isTypeSupported(value)) ?? ''
}

function filenameForMimeType(mimeType: string) {
  if (mimeType === 'audio/mp4') return 'lesson-note.m4a'
  if (mimeType === 'audio/ogg') return 'lesson-note.ogg'
  return 'lesson-note.webm'
}
