'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { LessonPreparationApprovalStatus } from '@/core/application/lesson-preparation-approval'
import {
  buildLessonWorkspaceHref,
  resolveHumanTaskResourcesForSurface,
  type HumanTaskLessonProjection,
} from '@/core/presentation/human-task-content'
import { buildLessonBrief } from '@/core/presentation/lesson-brief'
import { LessonDesignTools } from './lesson-design-tools'
import type { LessonKnowledgeSuggestion } from './lesson-material-suggestions'
import { approveLessonPreparationAndProceed } from './preparation-approval-actions'
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
  approval,
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  extensions: LessonDesignExtension[]
  knowledgeSuggestions: LessonKnowledgeSuggestion[]
  progress: Progress
  udaProgress: { completed: number; total: number }
  approval: {
    status: LessonPreparationApprovalStatus
    approvedAt: string | null
    notice: string | null
    alignmentAuthority: 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL' | null
    requiresRevalidationOnApproval: boolean | null
  }
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

        <div className={styles.planBoundary} role="status" aria-live="polite">
          <strong>{approvalTitle(approval.status)}</strong>
          <span>{approvalMessage(
            approval.status,
            approval.approvedAt,
            approval.notice,
            approval.alignmentAuthority,
            approval.requiresRevalidationOnApproval,
          )}</span>
        </div>

        <div className={styles.closeActions}>
          {recorded ? (
            <Link className={styles.primary} href={teachHref}>Apri la guida della lezione</Link>
          ) : approval.status === 'APPROVED' ? (
            <Link className={styles.primary} href={teachHref}>Procedi alla lezione</Link>
          ) : approval.status === 'CURRICULUM_REQUIRED' ? null : (
            <form action={approveLessonPreparationAndProceed}>
              <input type="hidden" name="sectionId" value={sectionId} />
              <input type="hidden" name="blockId" value={block.id} />
              <input type="hidden" name="projectionId" value={projection.projectionId} />
              <button className={styles.primary} type="submit">Approva e procedi</button>
            </form>
          )}
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

function approvalTitle(status: LessonPreparationApprovalStatus) {
  if (status === 'APPROVED') return 'Preparazione approvata'
  if (status === 'STALE') return 'La preparazione è cambiata'
  if (status === 'CURRICULUM_REQUIRED') return 'Curricolo da rivalidare'
  return 'Conferma del docente richiesta'
}

function approvalMessage(
  status: LessonPreparationApprovalStatus,
  approvedAt: string | null,
  notice: string | null,
  alignmentAuthority: 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL' | null,
  requiresRevalidationOnApproval: boolean | null,
) {
  const provisional = alignmentAuthority === 'PROVISIONAL_BASELINE' && requiresRevalidationOnApproval === true
  if (status === 'APPROVED') {
    if (provisional) {
      return approvedAt
        ? `Hai approvato questa lezione il ${formatApprovalDate(approvedAt)} sulla baseline Arena provvisoria ma completa. Puoi procedere; quando Arena registrerà l’adozione istituzionale, Docente OS richiederà una nuova rivalidazione.`
        : 'Hai approvato questa lezione sulla baseline Arena provvisoria ma completa. Puoi procedere; l’adozione istituzionale futura richiederà una nuova rivalidazione.'
    }
    return approvedAt
      ? `Hai approvato questa versione il ${formatApprovalDate(approvedAt)}. Puoi procedere alla lezione.`
      : 'Questa versione è approvata. Puoi procedere alla lezione.'
  }
  if (status === 'STALE') {
    return 'Dopo l’ultima approvazione sono cambiati curricolo, proiezione o elementi didattici accettati. Controlla e approva di nuovo.'
  }
  if (status === 'CURRICULUM_REQUIRED') {
    return 'Prima di procedere serve una baseline Arena completa per la progettazione, coerente con questa classe e con copertura curricolare soddisfatta.'
  }
  if (provisional) {
    return 'La baseline Arena è provvisoria ma completa per la progettazione. “Approva e procedi” conferma solo questa preparazione didattica; non approva il curricolo d’istituto e resterà soggetta a rivalidazione quando Arena registrerà l’adozione definitiva.'
  }
  if (notice === 'required') {
    return 'Per avviare una lezione futura devi prima confermare esplicitamente la preparazione mostrata qui.'
  }
  if (notice === 'changed') {
    return 'La proiezione della lezione è cambiata. Controlla la versione corrente prima di confermare.'
  }
  return 'Controlla obiettivo, attività e materiali. “Approva e procedi” conferma esattamente la preparazione corrente.'
}

function formatApprovalDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Rome',
  }).format(date)
}
