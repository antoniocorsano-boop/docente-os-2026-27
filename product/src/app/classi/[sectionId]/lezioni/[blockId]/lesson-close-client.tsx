'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { LessonReflectionCaptureActionResult } from '@/core/application/copilot/lesson-reflection-handler'
import type { ContextualCaptureProposalKind } from '@/core/presentation/contextual-capture'
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
import LessonVoiceCapture from './lesson-voice-capture'
import styles from './lesson-live.module.css'

type Block = {
  id: string
  uda: string
  pack: string
  period: string
  focus: string
  hours: number
}

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
  voiceCaptureEnabled,
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  defaultLocalDate: string
  registrationKey: string
  voiceCaptureEnabled: boolean
}) {
  const router = useRouter()
  const [observationDraft, setObservationDraft] = useState<LessonObservationDraftTransport | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [evidenceNote, setEvidenceNote] = useState('')
  const [nextActivity, setNextActivity] = useState('')
  const [udaChangeProposal, setUdaChangeProposal] = useState('')
  const [capturePreview, setCapturePreview] = useState<LessonReflectionCaptureActionResult | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [organizing, setOrganizing] = useState(false)
  const [voiceBusy, setVoiceBusy] = useState(false)
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
      const message = error instanceof Error ? error.message : ''
      setSaveError(
        /Minified React error|react\.dev\/errors|Server Components render/i.test(message)
          ? 'La registrazione non è stata confermata. I dati inseriti restano disponibili: puoi riprovare senza ricominciare.'
          : message || 'Non è stato possibile registrare la lezione. I dati inseriti restano disponibili per un nuovo tentativo.',
      )
    } finally {
      setSaving(false)
    }
  }

  function updateEvidenceNote(value: string) {
    setEvidenceNote(value)
    setCapturePreview(null)
    setCaptureError(null)
  }

  function appendVoiceTranscript(transcript: string) {
    setEvidenceNote((current) => {
      const existing = current.trim()
      const spoken = transcript.trim()
      if (!spoken || existing.length >= 4000) return current

      const separator = existing ? '\n' : ''
      const remaining = 4000 - existing.length
      if (remaining <= separator.length) return existing

      return `${existing}${separator}${spoken.slice(0, remaining - separator.length)}`
    })
    setCapturePreview(null)
    setCaptureError(null)
  }

  async function organizeEvidenceNote() {
    const note = evidenceNote.trim()
    if (!note) {
      setCapturePreview(null)
      setCaptureError('Scrivi prima una breve nota sulla lezione.')
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
        body: JSON.stringify({ prompt: buildLessonReflectionCapturePrompt(note) }),
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

        {voiceCaptureEnabled ? (
          <LessonVoiceCapture
            disabled={saving || organizing}
            onBusyChange={setVoiceBusy}
            onTranscript={appendVoiceTranscript}
          />
        ) : null}

        <div className={styles.assistantTools}>
          <button className={styles.assistantAction} type="button" onClick={organizeEvidenceNote} disabled={!evidenceNote.trim() || organizing || voiceBusy}>
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

        <label className={styles.note}>
          <span>Cosa cambieresti nel percorso?</span>
          <textarea
            name="udaChangeProposal"
            maxLength={450}
            value={udaChangeProposal}
            onChange={(event) => setUdaChangeProposal(event.target.value)}
            placeholder="Per esempio: anticipare l’attività pratica e ridurre la spiegazione iniziale."
          />
        </label>
        <p className={styles.privacyNote}>È una riflessione facoltativa. Resterà nel Diario: non modifica il Piano o l’UDA e non crea da sola una proposta di riprogettazione.</p>

        <details className={styles.evidence}>
          <summary>Promemoria didattico</summary>
          <strong>{projection.evidence}</strong>
          <p className={styles.detailText}>Resta un riferimento per il docente e non viene trasformato automaticamente in una prova registrata.</p>
        </details>

        {saveError ? <p className={styles.privacyNote} role="alert">{saveError}</p> : null}

        <div className={styles.closeActions}>
          <button className={styles.primary} type="submit" disabled={saving || !draftLoaded || voiceBusy}>
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

function lessonObservationStorageKey(sectionId: string, blockId: string) {
  return `docente-os:lesson-observation:${sectionId}:${blockId}`
}
