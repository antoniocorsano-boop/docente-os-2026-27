'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const teachHref = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(block.id)}?mode=teach`
  const observeHref = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(block.id)}?mode=observe`
  const observationStorageKey = lessonObservationStorageKey(sectionId, block.id)
  const liveStorageKey = `docente-os:lesson-live:${sectionId}:${block.id}`

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
      setSaveError(error instanceof Error ? error.message : 'Non è stato possibile registrare la lezione. I dati locali restano disponibili per un nuovo tentativo.')
    } finally {
      setSaving(false)
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
          <p className={styles.closeLead}>Controlla data e durata effettiva. Nota e osservazione sono facoltative: non devi ricopiare obiettivi, sequenza o materiali già presenti.</p>
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
          <textarea name="evidenceNote" maxLength={4000} placeholder="Per esempio: funzione e materiali compresi; tecnica/tecnologia da riprendere." />
        </label>

        <details className={styles.evidence}>
          <summary>Promemoria didattico</summary>
          <strong>{projection.evidence}</strong>
          <p className={styles.detailText}>Resta un riferimento per il docente e non viene trasformato automaticamente in una prova registrata.</p>
        </details>

        {saveError ? <p className={styles.privacyNote} role="alert">{saveError}</p> : null}

        <div className={styles.closeActions}>
          <button className={styles.primary} type="submit" disabled={saving || !draftLoaded}>
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
