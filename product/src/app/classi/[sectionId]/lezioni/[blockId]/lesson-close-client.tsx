'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { LessonReflectionCaptureActionResult } from '@/core/application/copilot/lesson-reflection-handler'
import type { ContextualCaptureProposalKind, ContextualCaptureSourceKind } from '@/core/presentation/contextual-capture'
import {
  buildLessonReflectionCapturePrompt,
  CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH,
} from '@/core/presentation/contextual-capture-frontdoor'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import {
  LESSON_OBSERVATION_DIMENSION_OPTIONS,
  LESSON_OBSERVATION_STATE_OPTIONS,
  parseStoredLessonObservationDraft,
  type LessonObservationDraftTransport,
} from '../lesson-observation-model'
import { recordLessonExecution } from '../actions'
import styles from './lesson-live.module.css'

type Block = {
  id: string
  uda: string
  pack: string
  period: string
  focus: string
  hours: number
}

type VoiceState = 'IDLE' | 'RECORDING' | 'TRANSCRIBING'

type VoiceTranscriptionPayload =
  | { transcript: string; sourceKind: 'EPHEMERAL_TRANSCRIPT' }
  | { message?: string }

const VOICE_CAPTURE_MAX_MS = 90_000

const CAPTURE_LABELS: Record<ContextualCaptureProposalKind, string> = {
  LESSON_EXECUTION_NOTE: 'Ciò che è stato svolto',
  PROFESSIONAL_OBSERVATION: 'Osservazione professionale',
  NEXT_LESSON_FOCUS: 'Da riprendere',
  PREPARATION_NEED: 'Da preparare',
  REMINDER_CANDIDATE: 'Promemoria',
}

export default function LessonCloseClient({
  sectionId,
  sectionLabel,
  block,
  projection,
  defaultLocalDate,
  registrationKey,
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  defaultLocalDate: string
  registrationKey: string
}) {
  const router = useRouter()
  const [observationDraft, setObservationDraft] = useState<LessonObservationDraftTransport | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [evidenceNote, setEvidenceNote] = useState('')
  const [evidenceSourceKind, setEvidenceSourceKind] = useState<ContextualCaptureSourceKind>('MANUAL_TEXT')
  const [nextActivity, setNextActivity] = useState('')
  const [capturePreview, setCapturePreview] = useState<LessonReflectionCaptureActionResult | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [organizing, setOrganizing] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const voiceChunksRef = useRef<Blob[]>([])
  const voiceTimeoutRef = useRef<number | null>(null)
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const teachHref = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(block.id)}?mode=teach`
  const observeHref = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(block.id)}?mode=observe`
  const observationStorageKey = lessonObservationStorageKey(sectionId, block.id)
  const liveStorageKey = `docente-os:lesson-live:${sectionId}:${block.id}`
  const suggestedNextActivity = capturePreview?.nextActivity ?? null

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setObservationDraft(parseStoredLessonObservationDraft(window.sessionStorage.getItem(observationStorageKey)))
      } catch {
        window.sessionStorage.removeItem(observationStorageKey)
        setObservationDraft(null)
      } finally {
        setDraftLoaded(true)
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [observationStorageKey])

  useEffect(() => () => {
    if (voiceTimeoutRef.current !== null) window.clearTimeout(voiceTimeoutRef.current)
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    stopMediaStream()
  }, [])

  async function submitLesson(formData: FormData) {
    setSaveError(null)
    setSaving(true)
    try {
      const receipt = await recordLessonExecution(formData)
      try {
        window.sessionStorage.removeItem(observationStorageKey)
        window.sessionStorage.removeItem(liveStorageKey)
      } catch {
        // The canonical receipt is authoritative even if browser storage is unavailable.
      }
      router.push(`${classHref}?session=${encodeURIComponent(receipt.teachingSessionId)}`)
      router.refresh()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Non è stato possibile registrare la lezione. I dati locali restano disponibili per un nuovo tentativo.')
    } finally {
      setSaving(false)
    }
  }

  function updateEvidenceNote(value: string, sourceKind: ContextualCaptureSourceKind = 'MANUAL_TEXT') {
    setEvidenceNote(value)
    setEvidenceSourceKind(sourceKind)
    setCapturePreview(null)
    setCaptureError(null)
  }

  async function startVoiceCapture() {
    setVoiceError(null)
    setCaptureError(null)

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('Il browser non supporta la dettatura audio. Puoi continuare a scrivere la nota manualmente.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      voiceChunksRef.current = []

      const mimeType = preferredRecordingMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data)
      })
      recorder.addEventListener('stop', () => {
        void transcribeVoiceCapture(recorder.mimeType || mimeType || 'audio/webm')
      }, { once: true })
      recorder.addEventListener('error', () => {
        clearVoiceTimeout()
        stopMediaStream()
        mediaRecorderRef.current = null
        setVoiceState('IDLE')
        setVoiceError('La registrazione audio si è interrotta. Puoi continuare a scrivere la nota manualmente.')
      }, { once: true })

      recorder.start()
      setVoiceState('RECORDING')
      voiceTimeoutRef.current = window.setTimeout(() => stopVoiceCapture(), VOICE_CAPTURE_MAX_MS)
    } catch {
      stopMediaStream()
      setVoiceState('IDLE')
      setVoiceError('Non posso usare il microfono. Controlla il permesso del browser oppure continua con la nota manuale.')
    }
  }

  function stopVoiceCapture() {
    clearVoiceTimeout()
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    setVoiceState('TRANSCRIBING')
    recorder.stop()
  }

  async function transcribeVoiceCapture(mimeType: string) {
    clearVoiceTimeout()
    const chunks = voiceChunksRef.current
    voiceChunksRef.current = []
    mediaRecorderRef.current = null
    stopMediaStream()

    if (chunks.length === 0) {
      setVoiceState('IDLE')
      setVoiceError('Non ho ricevuto audio da trascrivere. Puoi riprovare o scrivere la nota manualmente.')
      return
    }

    setVoiceState('TRANSCRIBING')
    try {
      const audio = new Blob(chunks, { type: mimeType })
      const form = new FormData()
      form.append('audio', audio, `lesson-note.${extensionForRecordingMimeType(mimeType)}`)

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: {
          'X-Docente-Surface-Path': `${window.location.pathname}${window.location.search}`,
        },
        body: form,
      })
      const payload = await response.json().catch(() => null) as VoiceTranscriptionPayload | null

      if (!response.ok || !payload || !('transcript' in payload)) {
        const message = payload && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : 'Non sono riuscito a trascrivere la nota. Puoi continuare manualmente.'
        setVoiceError(message)
        return
      }

      const transcript = payload.transcript.trim()
      if (!transcript) {
        setVoiceError('La trascrizione è vuota. Puoi riprovare o scrivere la nota manualmente.')
        return
      }

      const combined = evidenceNote.trim()
        ? `${evidenceNote.trim()}\n${transcript}`
        : transcript
      updateEvidenceNote(combined, payload.sourceKind)
      setVoiceError(null)
    } catch {
      setVoiceError('La dettatura non è disponibile. La nota manuale resta utilizzabile senza perdere nulla.')
    } finally {
      setVoiceState('IDLE')
    }
  }

  async function organizeEvidenceNote() {
    const note = evidenceNote.trim()
    if (!note) {
      setCapturePreview(null)
      setCaptureError('Scrivi o detta prima una breve nota sulla lezione.')
      return
    }
    if (note.length > CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH) {
      setCapturePreview(null)
      setCaptureError(`Per organizzarla con il Copilota, riduci la nota a ${CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH} caratteri. Puoi comunque registrarla così com’è.`)
      return
    }

    setOrganizing(true)
    setCaptureError(null)
    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Docente-Surface-Path': `${window.location.pathname}${window.location.search}`,
        },
        body: JSON.stringify({ prompt: buildLessonReflectionCapturePrompt(note, evidenceSourceKind) }),
      })
      const payload = await response.json().catch(() => null) as LessonReflectionCaptureActionResult | { message?: string } | null

      if (!response.ok || !payload || !('skillId' in payload) || payload.skillId !== 'LESSON_REFLECTION' || payload.status !== 'SUPPORTED') {
        const message = payload && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : 'Il Copilota non riesce a organizzare questa nota nel contesto corrente.'
        setCapturePreview(null)
        setCaptureError(message)
        return
      }

      setCapturePreview(payload)
    } catch {
      setCapturePreview(null)
      setCaptureError('Il Copilota non è disponibile. La nota resta qui e puoi registrare normalmente la lezione.')
    } finally {
      setOrganizing(false)
    }
  }

  function clearVoiceTimeout() {
    if (voiceTimeoutRef.current === null) return
    window.clearTimeout(voiceTimeoutRef.current)
    voiceTimeoutRef.current = null
  }

  function stopMediaStream() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }

  const observationDimensionLabel = observationDraft
    ? LESSON_OBSERVATION_DIMENSION_OPTIONS.find((item) => item.value === observationDraft.dimensionKey)?.label ?? observationDraft.dimensionKey
    : null
  const observationStateLabel = observationDraft
    ? LESSON_OBSERVATION_STATE_OPTIONS.find((item) => item.value === observationDraft.state)?.label ?? observationDraft.state
    : null

  return (
    <main className={styles.closeSurface}>
      <form action={submitLesson} className={styles.closeCard}>
        <div>
          <Link className={styles.back} href={classHref}>← {sectionLabel}</Link>
          <p className={styles.eyebrow}>REGISTRA LA LEZIONE · {sectionLabel}</p>
          <h1>Conferma ciò che hai svolto</h1>
          <p className={styles.closeLead}>Controlla data e durata effettiva. Nota, osservazione e prossima attività sono facoltative: non devi ricopiare obiettivi, sequenza o materiali già presenti.</p>
        </div>

        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="blockId" value={block.id} />
        <input type="hidden" name="registrationKey" value={registrationKey} />
        <input type="hidden" name="observationDimension" value={observationDraft?.dimensionKey ?? ''} />
        <input type="hidden" name="observationState" value={observationDraft?.state ?? ''} />
        <input type="hidden" name="observationNote" value={observationDraft?.note ?? ''} />

        <div className={styles.sessionFacts}>
          <label className={styles.sessionField}>
            <span>Data della lezione</span>
            <input type="date" name="localDate" required defaultValue={defaultLocalDate} max={defaultLocalDate} />
          </label>
          <label className={styles.sessionField}>
            <span>Minuti effettivi</span>
            <input type="number" name="actualMinutes" required min={1} max={1440} defaultValue={projection.durationMinutes} inputMode="numeric" />
          </label>
        </div>

        <p className={styles.planBoundary}>
          <strong>Cosa succede quando registri</strong>
          <span>Salvi ciò che è stato svolto in questa lezione. Il percorso annuale non viene segnato automaticamente come completato: potrai decidere dopo, dalla Classe.</span>
        </p>

        {observationDraft ? (
          <section className={styles.evidence} aria-label="Osservazione professionale da registrare">
            <span>OSSERVAZIONE DA REGISTRARE</span>
            <strong>{observationDimensionLabel} · {observationStateLabel}</strong>
            {observationDraft.note ? <p className={styles.detailText}>{observationDraft.note}</p> : null}
            <p className={styles.privacyNote}>Sarà salvata come osservazione della classe insieme alla registrazione. Nessun dato individuale viene aggiunto.</p>
          </section>
        ) : (
          <p className={styles.privacyNote}>Nessuna osservazione professionale sarà registrata. Puoi comunque salvare normalmente la lezione.</p>
        )}

        <label className={styles.note}>
          <span>Una nota sulla lezione, solo se serve</span>
          <textarea
            name="evidenceNote"
            maxLength={4000}
            value={evidenceNote}
            onChange={(event) => updateEvidenceNote(event.target.value)}
            placeholder="Per esempio: funzione e materiali compresi; tecnica/tecnologia da riprendere."
          />
        </label>

        <div className={styles.assistantTools} aria-live="polite">
          {voiceState === 'RECORDING' ? (
            <button className={styles.assistantAction} type="button" onClick={stopVoiceCapture} aria-pressed="true">
              Interrompi dettatura
            </button>
          ) : (
            <button className={styles.assistantAction} type="button" onClick={startVoiceCapture} disabled={voiceState === 'TRANSCRIBING'}>
              {voiceState === 'TRANSCRIBING' ? 'Trascrizione…' : 'Detta con il microfono'}
            </button>
          )}
          <span>
            {voiceState === 'RECORDING'
              ? 'Sto ascoltando. Interrompi quando hai finito.'
              : 'L’audio serve solo a creare questa nota e non viene salvato.'}
          </span>
        </div>
        {voiceError ? <p className={styles.privacyNote} role="alert">{voiceError}</p> : null}

        <div className={styles.assistantTools}>
          <button className={styles.assistantAction} type="button" onClick={organizeEvidenceNote} disabled={!evidenceNote.trim() || organizing || voiceState !== 'IDLE'}>
            {organizing ? 'Organizzazione…' : 'Organizza con il Copilota'}
          </button>
          <span>Il Copilota propone soltanto: nulla viene registrato finché non confermi la lezione.</span>
        </div>
        {captureError ? <p className={styles.privacyNote} role="alert">{captureError}</p> : null}

        {capturePreview ? (
          <section className={styles.assistantPreview} aria-label="Proposta del Copilota" aria-live="polite">
            <span>PROPOSTA DEL COPILOTA · NON SALVATA</span>
            <strong>Ho organizzato la nota in {capturePreview.effects.length} {capturePreview.effects.length === 1 ? 'punto' : 'punti'}.</strong>
            <ul>
              {capturePreview.effects.map((effect) => (
                <li key={`${effect.kind}:${effect.summary}`}>
                  <b>{CAPTURE_LABELS[effect.kind]}</b>
                  <p>{effect.summary}</p>
                </li>
              ))}
            </ul>
            {suggestedNextActivity ? (
              <div className={styles.assistantSuggestion}>
                <span>PROSSIMA ATTIVITÀ PROPOSTA</span>
                <p>{suggestedNextActivity}</p>
                <button className={styles.assistantAction} type="button" onClick={() => setNextActivity(suggestedNextActivity)}>
                  Usa come prossima attività
                </button>
              </div>
            ) : null}
            <p className={styles.privacyNote}>Questa è solo una proposta. La registrazione avviene esclusivamente con “Registra e torna alla classe”.</p>
          </section>
        ) : null}

        <label className={styles.note}>
          <span>Prossima attività</span>
          <textarea
            name="nextActivity"
            maxLength={450}
            value={nextActivity}
            onChange={(event) => setNextActivity(event.target.value)}
            placeholder="Per esempio: riprendere la prospettiva centrale e completare l’esercizio 2."
          />
        </label>
        <p className={styles.privacyNote}>Se la indichi, resterà nel Diario come continuità didattica per la prossima lezione, anche senza un materiale o un collegamento Drive.</p>

        <details className={styles.evidence}>
          <summary>Promemoria didattico</summary>
          <strong>{projection.evidence}</strong>
          <p className={styles.detailText}>Resta un riferimento per il docente e non viene trasformato automaticamente in una prova registrata.</p>
        </details>

        {saveError ? <p className={styles.privacyNote} role="alert">{saveError}</p> : null}

        <div className={styles.closeActions}>
          <button className={styles.primary} type="submit" disabled={saving || !draftLoaded || voiceState !== 'IDLE'}>
            {saving ? 'Registrazione…' : 'Registra e torna alla classe'}
          </button>
          <details className={styles.evidence}>
            <summary>Prima di registrare</summary>
            <div className={styles.detailStack}>
              <Link href={observeHref}>Rivedi le osservazioni</Link>
              <Link href={teachHref}>Torna alla guida della lezione</Link>
            </div>
          </details>
        </div>
      </form>
    </main>
  )
}

function preferredRecordingMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? ''
}

function extensionForRecordingMimeType(mimeType: string) {
  const normalized = mimeType.toLocaleLowerCase('en-US')
  if (normalized.includes('ogg')) return 'ogg'
  if (normalized.includes('mp4')) return 'mp4'
  if (normalized.includes('wav')) return 'wav'
  return 'webm'
}

function lessonObservationStorageKey(sectionId: string, blockId: string) {
  return `docente-os:lesson-observation:${sectionId}:${blockId}`
}
