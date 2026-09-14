'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import {
  buildLessonWorkspaceHref,
  resolveHumanTaskResourcesForSurface,
  type HumanTaskLessonProjection,
} from '@/core/presentation/human-task-content'
import { buildLessonBrief } from '@/core/presentation/lesson-brief'
import { LessonDesignTools } from './lesson-design-tools'
import type { LessonKnowledgeSuggestion } from './lesson-material-suggestions'
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
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  extensions: LessonDesignExtension[]
  knowledgeSuggestions: LessonKnowledgeSuggestion[]
  progress: Progress
  udaProgress: { completed: number; total: number }
}) {
  const [prepared, setPrepared] = useState<Record<number, boolean>>({})
  const preparationResources = useMemo(() => resolveHumanTaskResourcesForSurface(projection, 'PREPARE'), [projection])
  const brief = useMemo(() => buildLessonBrief({ projection, extensions }), [projection, extensions])
  const preparedCount = Object.values(prepared).filter(Boolean).length
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const teachHref = buildLessonWorkspaceHref(sectionId, block.id, 'teach')
  const recorded = progress.status === 'SVOLTO' || progress.status === 'RECUPERATO' || progress.status === 'RIMODULATO'

  return (
    <main className={styles.closeSurface}>
      <section className={`${styles.closeCard} ${styles.lessonBriefCard}`}>
        <header className={styles.lessonBriefHeader}>
          <Link className={styles.back} href={classHref}>← {sectionLabel}</Link>
          <p className={styles.eyebrow}>PRIMA DELLA LEZIONE · {sectionLabel}</p>
          <h1>{brief.title}</h1>
          <p className={styles.closeLead}>{brief.objective}</p>
        </header>

        <div className={styles.meta}>
          <span>{formatDuration(brief.durationMinutes)}</span>
          <span>{projection.udaTitle}</span>
          <span>{udaProgress.completed}/{udaProgress.total} concluse</span>
          {recorded ? <span>Già registrata</span> : null}
        </div>

        <div className={styles.lessonBriefGrid}>
          <section className={styles.lessonBriefPanel} aria-labelledby="lesson-brief-needs">
            <span className={styles.lessonBriefLabel}>PER INIZIARE</span>
            <h2 id="lesson-brief-needs">Ti serve</h2>
            {brief.preparationPreview.length > 0 ? (
              <ul>
                {brief.preparationPreview.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : <p>Nessuna preparazione specifica indicata.</p>}
            {brief.remainingPreparationCount > 0 ? (
              <p className={styles.lessonBriefMore}>+ {brief.remainingPreparationCount} {brief.remainingPreparationCount === 1 ? 'elemento nel dettaglio' : 'elementi nel dettaglio'}</p>
            ) : null}
          </section>

          <section className={styles.lessonBriefPanel} aria-labelledby="lesson-brief-ready">
            <span className={styles.lessonBriefLabel}>GIÀ DISPONIBILE NEL SISTEMA</span>
            <h2 id="lesson-brief-ready">Pronto da usare</h2>
            {brief.readyTitles.length > 0 ? (
              <ul>
                {brief.readyTitles.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p>La sequenza canonica della lezione è già disponibile.</p>
            )}
            {brief.readyCount > brief.readyTitles.length ? (
              <p className={styles.lessonBriefMore}>+ {brief.readyCount - brief.readyTitles.length} {brief.readyCount - brief.readyTitles.length === 1 ? 'risorsa nel dettaglio' : 'risorse nel dettaglio'}</p>
            ) : null}
          </section>
        </div>

        <div className={styles.closeActions}>
          <Link className={styles.primary} href={teachHref}>{recorded ? 'Apri la guida della lezione' : 'Avvia la lezione'}</Link>
        </div>

        <details className={styles.lessonPlanDetails}>
          <summary>Vedi progettazione completa</summary>
          <div className={styles.lessonPlanDetailsBody}>
            <section className={styles.prepChecklist} aria-label="Materiali da predisporre">
              <div className={styles.prepHeading}><strong>Cosa predisporre</strong><span>{preparedCount}/{projection.preparation.length}</span></div>
              {projection.preparation.map((item, index) => (
                <label key={item}>
                  <input type="checkbox" checked={Boolean(prepared[index])} onChange={(event) => setPrepared((current) => ({ ...current, [index]: event.target.checked }))} />
                  <span>{item}</span>
                </label>
              ))}
            </section>

            {preparationResources.length ? (
              <details className={styles.evidence}>
                <summary>Materiali e consegne già predisposti</summary>
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
          </div>
        </details>

        <Link className={styles.lessonBriefBack} href={classHref}>Torna alla classe</Link>
      </section>
    </main>
  )
}

function formatDuration(minutes: number) {
  if (minutes === 120) return '2 ore'
  if (minutes % 60 === 0) return `${minutes / 60} ore`
  return `${minutes} min`
}
