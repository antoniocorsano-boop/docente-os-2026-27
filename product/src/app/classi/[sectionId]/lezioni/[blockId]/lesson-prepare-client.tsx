'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { LessonPreparationState } from '@/core/domain/lesson-preparation'
import {
  buildLessonWorkspaceHref,
  resolveHumanTaskResourcesForSurface,
  type HumanTaskLessonProjection,
} from '@/core/presentation/human-task-content'
import { LessonDesignTools } from './lesson-design-tools'
import type { LessonKnowledgeSuggestion } from './lesson-material-suggestions'
import { confirmLessonPreparation, resetLessonPreparation } from './preparation-actions'
import styles from './lesson-live.module.css'

type Block = {
  id: string
  uda: string
  pack: string
  period: string
  focus: string
  hours: number
}

type Progress = {
  status: string
  executedOn: string | null
  evidenceNote: string | null
}

export default function LessonPrepareClient({
  sectionId,
  sectionLabel,
  block,
  projection,
  extensions,
  knowledgeSuggestions,
  progress,
  udaProgress,
  preparationState,
  preparationConfirmedAt,
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  extensions: LessonDesignExtension[]
  knowledgeSuggestions: LessonKnowledgeSuggestion[]
  progress: Progress
  udaProgress: { completed: number; total: number }
  preparationState: LessonPreparationState
  preparationConfirmedAt: string | null
}) {
  const initiallyReady = preparationState.status === 'READY'
  const [prepared, setPrepared] = useState<Record<number, boolean>>(() => Object.fromEntries(
    projection.preparation.map((_, index) => [index, initiallyReady]),
  ))
  const preparationResources = useMemo(() => resolveHumanTaskResourcesForSurface(projection, 'PREPARE'), [projection])
  const preparedCount = Object.values(prepared).filter(Boolean).length
  const allChecked = preparedCount === projection.preparation.length
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const teachHref = buildLessonWorkspaceHref(sectionId, block.id, 'teach')
  const recorded = progress.status === 'SVOLTO' || progress.status === 'RECUPERATO' || progress.status === 'RIMODULATO'
  const confirmationBlocked = preparationState.status === 'NEEDS_CONFIRMATION'

  return (
    <main className={styles.closeSurface}>
      <section className={styles.closeCard}>
        <div>
          <Link className={styles.back} href={classHref}>← {sectionLabel}</Link>
          <p className={styles.eyebrow}>PRIMA DELLA LEZIONE · {sectionLabel}</p>
          <h1>Prepara solo ciò che serve</h1>
          <p className={styles.closeLead}>{projection.title} · {projection.objective}</p>
        </div>

        <div className={styles.meta}>
          <span>{formatDuration(projection.durationMinutes)}</span>
          <span>{projection.udaTitle}</span>
          <span>{udaProgress.completed}/{udaProgress.total} concluse</span>
          {recorded ? <span>Già registrata</span> : null}
        </div>

        <section className={styles.prepChecklist} aria-labelledby="preparation-state-title">
          <div className={styles.prepHeading}>
            <div>
              <strong id="preparation-state-title">Preparazione · {preparationState.label}</strong>
              <small>{preparationState.reason}</small>
            </div>
            <span>{preparedCount}/{projection.preparation.length}</span>
          </div>

          {preparationState.status === 'READY' && preparationConfirmedAt ? (
            <p role="status">Confermata {formatConfirmationTime(preparationConfirmedAt)}. Se cambi la lezione o i materiali, il sistema ti chiederà di controllarla di nuovo.</p>
          ) : null}

          {projection.preparation.map((item, index) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={Boolean(prepared[index])}
                onChange={(event) => setPrepared((current) => ({ ...current, [index]: event.target.checked }))}
              />
              <span>{item}</span>
            </label>
          ))}

          <div className={styles.closeActions}>
            {preparationState.status === 'READY' ? (
              <form action={resetLessonPreparation}>
                <PreparationContextFields sectionId={sectionId} blockId={block.id} projectionId={projection.projectionId} />
                <button type="submit">Segna da ricontrollare</button>
              </form>
            ) : (
              <form action={confirmLessonPreparation}>
                <PreparationContextFields sectionId={sectionId} blockId={block.id} projectionId={projection.projectionId} />
                <button className={styles.primary} type="submit" disabled={!allChecked || confirmationBlocked}>
                  {confirmationBlocked ? 'Controlla prima le proposte' : 'Conferma preparazione'}
                </button>
              </form>
            )}
          </div>
        </section>

        {preparationResources.length ? (
          <details className={styles.evidence}>
            <summary>Materiali e consegne già predisposti nel percorso</summary>
            <div className={styles.detailStack}>
              {preparationResources.map((resource) => (
                <article key={resource.id}><strong>{resource.title}</strong><p>{resource.instruction}</p></article>
              ))}
            </div>
          </details>
        ) : null}

        <LessonDesignTools
          sectionId={sectionId}
          blockId={block.id}
          projectionId={projection.projectionId}
          extensions={extensions}
          knowledgeSuggestions={knowledgeSuggestions}
        />

        <details className={styles.evidence}>
          <summary>Cosa devono imparare</summary>
          <ul className={styles.simpleList}>{projection.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul>
        </details>

        <div className={styles.closeActions}>
          <Link className={styles.primary} href={teachHref}>{recorded ? 'Apri la guida della lezione' : 'Avvia la lezione'}</Link>
          <Link href={classHref}>Torna alla classe</Link>
        </div>
      </section>
    </main>
  )
}

function PreparationContextFields({ sectionId, blockId, projectionId }: { sectionId: string; blockId: string; projectionId: string }) {
  return (
    <>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="blockId" value={blockId} />
      <input type="hidden" name="projectionId" value={projectionId} />
    </>
  )
}

function formatDuration(minutes: number) {
  if (minutes === 120) return '2 ore'
  if (minutes % 60 === 0) return `${minutes / 60} ore`
  return `${minutes} min`
}

function formatConfirmationTime(value: string) {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
