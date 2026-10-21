'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { LessonReflectionCaptureActionResult } from '@/core/application/copilot/lesson-reflection-handler'
import type { ContextualCaptureProposalKind } from '@/core/presentation/contextual-capture'
import {
  buildLessonReflectionCapturePrompt,
  CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH,
} from '@/core/presentation/contextual-capture-frontdoor'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { buildCanonicalLessonWorkspaceHref } from '@/core/presentation/lesson-workspace-route'
import {
  LESSON_OBSERVATION_DIMENSION_OPTIONS,
  LESSON_OBSERVATION_STATE_OPTIONS,
  parseStoredLessonObservationDraft,
  type LessonObservationDraftTransport,
} from '../lesson-observation-model'
import { recordLessonExecution, type LessonExecutionOutcome } from '../actions'
import LessonContinue from './lesson-continue'
import { LessonShell } from './lesson-shell'
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

type ContinuationState = {
  teachingSessionId: string
  observationCount: number
  outcome: LessonExecutionOutcome
  nextActivity: string | null
}

const OUTCOME_OPTIONS: Array<{ value: LessonExecutionOutcome; label: string }> = [
  { value: 'SVOLTO', label: 'Svolto' },
  { value: 'RECUPERATO', label: 'Recuperato' },
  { value: 'RIMODULATO', label: 'Rimodulato' },
  { value: 'ANNULLATO', label: 'Annullato' },
]

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
  nextBlockId,
  localDate,
  occurrenceLogicalId,
  statusLabel,
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  defaultLocalDate: string
  registrationKey: string
  voiceCaptureEnabled: boolean
  nextBlockId: string | null
  localDate: string | null
  occurrenceLogicalId: string | null
  statusLabel: string
}) {
  const [observationDraft, setObservationDraft] = useState<LessonObservationDraftTransport | null>(null)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [localDate, setLocalDate] = useState(defaultLocalDate)
  const [actualMinutes, setActualMinutes] = useState(String(projection.durationMinutes))
  const [outcome, setOutcome] = useState<LessonExecutionOutcome>('SVOLTO')
  const [evidenceNote, setEvidenceNote] = useState('')
  const [nextActivity, setNextActivity] = useState('')
  const [udaChangeProposal, setUdaChangeProposal] = useState('')
  const [continuation, setContinuation] = useState<ContinuationState | null>(null)
  const [capturePreview, setCapturePreview] = useState<LessonReflectionCaptureActionResult | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [organizing, setOrganizing] = useState(false)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const lessonHref = buildCanonicalLessonWorkspaceHref(sectionId, block.id, { localDate, occurrenceLogicalId })
  const observeHref = buildCanonicalLessonWorkspaceHref(sectionId, block.id, { localDate, occurrenceLogicalId, subtask: 'observe' })
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
      setContinuation(receipt)
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

  const lessonShell = (
    <LessonShell
      sectionLabel={sectionLabel}
      disciplineLabel="Tecnologia"
      lessonTitle={projection.title}
      statusLabel={continuation ? 'Registrata' : statusLabel}
    />
  )

  if (continuation) {
    return (
      <main className={styles.closeSurface}>
        {lessonShell}
        <LessonContinue
          sectionId={sectionId}
          blockId={block.id}
          nextBlockId={nextBlockId}
          outcome={continuation.outcome}
          nextActivity={continuation.nextActivity}
        />
      </main>
    )
  }

  return (
    <main className={styles.closeSurface}>
      {lessonShell}
      <form action={submitLesson} className={styles.closeCard}>
        <header className={styles.lessonBriefHeader}>
          <Link className={styles.back} href={classHref}>← {sectionLabel}</Link>
          <p className={styles.eyebrow}>REGISTRA LA LEZIONE · {sectionLabel}</p>
          <h2>Chiudi la lezione senza ricopiare tutto</h2>
          <p className={styles.closeLead}>Un passaggio alla volta. Salvi solo ciò che confermi; Piano e UDA non vengono modificati automaticamente.</p>
        </header>

        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="blockId" value={block.id} />
        <input type="hidden" name="registrationKey" value={registrationKey} />
        <input type="hidden" name="localDate" value={localDate} />
        <input type="hidden" name="actualMinutes" value={actualMinutes} />
        <input type="hidden" name="observationDimension" value={observationDraft?.dimensionKey ?? ''} />
        <input type="hidden" name="observationState" value={observationDraft?.state ?? ''} />
        <input type="hidden" name="observationNote" value={observationDraft?.note ?? ''} />
        <input type="hidden" name="evidenceNote" value={evidenceNote} />
        <input type="hidden" name="nextActivity" value={nextActivity} />
        <input type="hidden" name="udaChangeProposal" value={udaChangeProposal} />

        <section className={styles.closeStepPanel} aria-labelledby="close-fast-title">
          <span className={styles.lessonBriefLabel}>REGISTRA</span>
          <h2 id="close-fast-title">Che cosa è successo davvero?</h2>
          <p className={styles.privacyNote}>Conferma i fatti essenziali. Dettagli, osservazione e assistente restano disponibili solo se ti servono.</p>
          <p className={styles.lessonBriefLabel}>1 · DATI ESSENZIALI</p>

          <label className={styles.sessionField}>
            <span>Esito effettivo</span>
            <select name="outcome" value={outcome} onChange={(event) => setOutcome(event.target.value as LessonExecutionOutcome)}>
              {OUTCOME_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <label className={styles.note}>
            <span>Cosa abbiamo fatto</span>
            <textarea
              maxLength={4000}
              value={evidenceNote}
              onChange={(event) => updateEvidenceNote(event.target.value)}
              placeholder="Per esempio: completata l’introduzione; la catena di trasformazione sarà ripresa nella prossima lezione."
            />
          </label>

          <label className={styles.note}>
            <span>Prossima attività</span>
            <textarea
              maxLength={450}
              value={nextActivity}
              onChange={(event) => setNextActivity(event.target.value)}
              placeholder="Per esempio: completare la catena di trasformazione e passare agli impieghi dell’energia."
            />
          </label>
          <p className={styles.privacyNote}>La prossima attività resta nel Diario come continuità didattica; non modifica automaticamente il Piano annuale.</p>

          <details className={styles.compactDisclosure} data-registration-details>
            <summary>Dettagli della registrazione <small>data, durata e osservazione</small></summary>
            <div className={styles.detailStack}>
              <div className={styles.sessionFacts}>
                <label className={styles.sessionField}>
                  <span>Data della lezione</span>
                  <input type="date" required value={localDate} max={defaultLocalDate} onChange={(event) => setLocalDate(event.target.value)} />
                </label>
                <label className={styles.sessionField}>
                  <span>Minuti effettivi</span>
                  <input type="number" required min={1} max={1440} value={actualMinutes} inputMode="numeric" onChange={(event) => setActualMinutes(event.target.value)} />
                </label>
              </div>
              <div>
                <strong>{observationDraft ? 'Osservazione già raccolta' : 'Nessuna osservazione raccolta'}</strong>
                {observationDraft ? (
                  <div className={styles.detailStack}>
                    <p className={styles.detailText}>{observationDimensionLabel} · {observationStateLabel}</p>
                    {observationDraft.note ? <p className={styles.detailText}>{observationDraft.note}</p> : null}
                    <p className={styles.privacyNote}>Sarà salvata come osservazione della classe. Nessun dato individuale viene aggiunto.</p>
                  </div>
                ) : <p className={styles.privacyNote}>Puoi registrare normalmente la lezione senza aggiungere osservazioni.</p>}
              </div>
            </div>
          </details>

          <details className={styles.compactDisclosure} data-registration-advanced>
            <summary>Riflessione e assistente <small>facoltativi</small></summary>
            <div className={styles.detailStack}>
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
                      <button className={styles.assistantAction} type="button" onClick={() => setNextActivity(suggestedNextActivity)}>Usa come prossima attività</button>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <label className={styles.note}>
                <span>Cosa cambieresti nel percorso?</span>
                <textarea
                  maxLength={450}
                  value={udaChangeProposal}
                  onChange={(event) => setUdaChangeProposal(event.target.value)}
                  placeholder="Per esempio: anticipare l’attività pratica e ridurre la spiegazione iniziale."
                />
              </label>
              <p className={styles.privacyNote}>Resta una riflessione nel Diario: non modifica Piano o UDA.</p>

              <div>
                <strong>Promemoria didattico</strong>
                <p className={styles.detailText}>{projection.evidence}</p>
              </div>
            </div>
          </details>

          <details className={styles.compactDisclosure}>
            <summary>Cosa succede quando registri</summary>
            <div className={styles.detailStack}>
              <p className={styles.privacyNote}>Salvi la TeachingSession e le eventuali note confermate. L’esito guida CONTINUA, ma non aggiorna automaticamente il Piano annuale.</p>
              <Link href={observeHref}>Rivedi le osservazioni</Link>
              <Link href={lessonHref}>Torna alla Lezione</Link>
            </div>
          </details>

          {saveError ? <p className={styles.privacyNote} role="alert">{saveError}</p> : null}

          <div className={styles.closeActions}>
            <button className={styles.primary} type="submit" disabled={saving || !draftLoaded || voiceBusy || !localDate || !actualMinutes}>
              {saving ? 'Registrazione…' : 'Registra lezione'}
            </button>
          </div>
        </section>
      </form>
    </main>
  )
}

function lessonObservationStorageKey(sectionId: string, blockId: string) {
  return `docente-os:lesson-observation:${sectionId}:${blockId}`
}