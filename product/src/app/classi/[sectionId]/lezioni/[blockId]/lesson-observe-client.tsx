'use client'

import Link from 'next/link'
import { useEffect, useState, type MouseEvent } from 'react'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { buildCanonicalLessonWorkspaceHref } from '@/core/presentation/lesson-workspace-route'
import {
  LESSON_OBSERVATION_DIMENSION_OPTIONS,
  LESSON_OBSERVATION_STATE_OPTIONS,
  normalizeLessonObservationDraft,
  parseStoredLessonObservationDraft,
  persistLessonObservationDraft,
  type LessonObservationState,
} from '../lesson-observation-model'
import type { TeachingEvidenceDimensionKey } from '@/core/domain/teaching-evidence'
import { LessonShell } from './lesson-shell'
import styles from './lesson-live.module.css'

type Block = {
  id: string
  uda: string
  pack: string
  period: string
  focus: string
  hours: number
}

export default function LessonObserveClient({
  sectionId,
  sectionLabel,
  block,
  projection,
  localDate,
  occurrenceLogicalId,
  explicitStartIntent,
  statusLabel,
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  localDate: string | null
  occurrenceLogicalId: string | null
  explicitStartIntent: boolean
  statusLabel: string
}) {
  const [observed, setObserved] = useState<Record<number, boolean>>({})
  const [dimensionKey, setDimensionKey] = useState<'' | TeachingEvidenceDimensionKey>('')
  const [observationState, setObservationState] = useState<'' | LessonObservationState>('')
  const [observationNote, setObservationNote] = useState('')
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const observedCount = Object.values(observed).filter(Boolean).length
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const lessonHref = buildCanonicalLessonWorkspaceHref(sectionId, block.id, { localDate, occurrenceLogicalId, intent: explicitStartIntent ? 'start' : null })
  const recordHref = buildCanonicalLessonWorkspaceHref(sectionId, block.id, { localDate, occurrenceLogicalId, intent: 'close' })
  const storageKey = lessonObservationStorageKey(sectionId, block.id)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = parseStoredLessonObservationDraft(window.sessionStorage.getItem(storageKey))
        if (stored) {
          setDimensionKey(stored.dimensionKey)
          setObservationState(stored.state)
          setObservationNote(stored.note ?? '')
        }
      } catch {
        try {
          window.sessionStorage.removeItem(storageKey)
        } catch {
          // Storage may be unavailable; loading the page must still remain possible.
        }
      } finally {
        setDraftLoaded(true)
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [storageKey])

  useEffect(() => {
    if (!draftLoaded) return
    const frame = window.requestAnimationFrame(() => {
      try {
        persistLessonObservationDraft(window.sessionStorage, storageKey, {
          dimensionKey,
          state: observationState,
          note: observationNote,
        })
      } catch {
        // Keep the authored values in React state. Navigation enforces persistence when needed.
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [dimensionKey, draftLoaded, observationNote, observationState, storageKey])

  function persistBeforeNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (!draftLoaded) {
      event.preventDefault()
      setDraftError('Il promemoria locale è ancora in caricamento. Riprova.')
      return
    }

    let draft
    try {
      draft = normalizeLessonObservationDraft({
        dimensionKey,
        state: observationState,
        note: observationNote,
      })
    } catch (error) {
      event.preventDefault()
      setDraftError(error instanceof Error ? error.message : 'Completa oppure rimuovi l’osservazione prima di continuare.')
      return
    }

    if (!draft) {
      try {
        window.sessionStorage.removeItem(storageKey)
      } catch {
        // Observation-free navigation must not depend on browser storage availability.
      }
      setDraftError(null)
      return
    }

    try {
      persistLessonObservationDraft(window.sessionStorage, storageKey, draft)
      setDraftError(null)
    } catch {
      event.preventDefault()
      setDraftError('Non è possibile conservare l’osservazione nel browser. Riprova senza perdere questa pagina.')
    }
  }

  return (
    <main className={styles.closeSurface}>
      <LessonShell
        sectionLabel={sectionLabel}
        disciplineLabel="Tecnologia"
        lessonTitle={projection.title}
        statusLabel={statusLabel}
      />
      <section className={styles.closeCard}>
        <div>
          <p className={styles.eyebrow}>DOPO / DURANTE · OSSERVAZIONE</p>
          <h2 className={styles.closeHeading}>Guarda poche evidenze utili</h2>
          <p className={styles.closeLead}>Non devi compilare tutto. Usa questi indicatori solo per richiamare l’attenzione su ciò che ti serve per decidere il passo successivo.</p>
        </div>

        <div className={styles.evidence}>
          <span>EVIDENZA ATTESA</span>
          <strong>{projection.evidence}</strong>
        </div>

        <section className={styles.prepChecklist} aria-label="Indicatori di osservazione">
          <div className={styles.prepHeading}><strong>Cosa osservare</strong><span>{observedCount}/{projection.observation.length}</span></div>
          <p className={styles.privacyNote}>Queste spunte sono solo promemoria locali e non diventano automaticamente dati registrati.</p>
          {projection.observation.map((item, index) => (
            <label key={item}>
              <input type="checkbox" checked={Boolean(observed[index])} onChange={(event) => setObserved((current) => ({ ...current, [index]: event.target.checked }))} />
              <span>{item}</span>
            </label>
          ))}
        </section>

        <p className={styles.privacyNote}>Non inserire nomi, gruppi identificabili o dati individuali degli alunni.</p>

        <details data-observation-capture className={styles.evidence}>
          <summary>Registra un’osservazione professionale, se serve</summary>
          <div className={styles.detailStack}>
            <div>
              <span id="professional-observation-title">OSSERVAZIONE PROFESSIONALE · FACOLTATIVA</span>
              <strong>Registra una sola osservazione sintetica sulla classe</strong>
              <p className={styles.detailText}>Scegli una dimensione e uno stato solo se vuoi conservarli con la lezione.</p>
            </div>

            <div className={styles.sessionFacts}>
              <label className={styles.sessionField}>
                <span>Dimensione</span>
                <select value={dimensionKey} onChange={(event) => setDimensionKey(event.target.value as '' | TeachingEvidenceDimensionKey)}>
                  <option value="">Nessuna osservazione da registrare</option>
                  {LESSON_OBSERVATION_DIMENSION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className={styles.sessionField}>
                <span>Stato osservato</span>
                <select value={observationState} onChange={(event) => setObservationState(event.target.value as '' | LessonObservationState)}>
                  <option value="">Seleziona lo stato</option>
                  {LESSON_OBSERVATION_STATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className={styles.note}>
              <span>Nota breve, se serve</span>
              <textarea
                value={observationNote}
                onChange={(event) => setObservationNote(event.target.value)}
                maxLength={1000}
                placeholder="Per esempio: la classe avvia il lavoro in autonomia ma richiede ancora una guida nella verifica finale."
              />
            </label>
            {draftError ? <p className={styles.privacyNote} role="alert">{draftError}</p> : null}
          </div>
        </details>

        <details className={styles.evidence}>
          <summary>Vedi criteri completi</summary>
          <p className={styles.detailText}>{projection.assessmentNote}</p>
        </details>

        <div className={styles.closeActions}>
          <Link className={styles.primary} href={recordHref} onClick={persistBeforeNavigation}>Chiudi la lezione</Link>
          <Link href={lessonHref} onClick={persistBeforeNavigation}>Torna alla lezione</Link>
          <Link href={classHref} onClick={persistBeforeNavigation}>Esci senza registrare</Link>
        </div>
      </section>
    </main>
  )
}

function lessonObservationStorageKey(sectionId: string, blockId: string) {
  return `docente-os:lesson-observation:${sectionId}:${blockId}`
}
