'use client'

import Link from 'next/link'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
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

type Progress = {
  status: string
  executedOn: string | null
  evidenceNote: string | null
}

export default function LessonCloseClient({
  sectionId,
  sectionLabel,
  block,
  projection,
  progress,
  defaultLocalDate,
  registrationKey,
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  progress: Progress
  defaultLocalDate: string
  registrationKey: string
}) {
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const teachHref = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(block.id)}?mode=teach`
  const observeHref = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(block.id)}?mode=observe`

  return (
    <main className={styles.closeSurface}>
      <form
        action={recordLessonExecution}
        className={styles.closeCard}
        onSubmit={() => {
          try {
            window.sessionStorage.removeItem(`docente-os:lesson-live:${sectionId}:${block.id}`)
          } catch {
            // Closing a lesson must not depend on local browser storage.
          }
        }}
      >
        <div>
          <Link className={styles.back} href={classHref}>← {sectionLabel}</Link>
          <p className={styles.eyebrow}>REGISTRA LA LEZIONE · {sectionLabel}</p>
          <h1>Registra ciò che è realmente accaduto</h1>
          <p className={styles.closeLead}>Conferma data e durata effettiva. La nota è facoltativa: non devi ricopiare obiettivi, sequenza o materiali già presenti nel sistema.</p>
        </div>

        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="blockId" value={block.id} />
        <input type="hidden" name="registrationKey" value={registrationKey} />

        <div className={styles.sessionFacts}>
          <label className={styles.sessionField}>
            <span>Data della lezione</span>
            <input type="date" name="localDate" required defaultValue={defaultLocalDate} />
          </label>
          <label className={styles.sessionField}>
            <span>Minuti effettivi</span>
            <input type="number" name="actualMinutes" required min={1} max={1440} defaultValue={projection.durationMinutes} inputMode="numeric" />
          </label>
        </div>

        <p className={styles.planBoundary}>
          <strong>Piano annuale: {progress.status}</strong>
          <span>Questa registrazione documenta la lezione e attribuisce i minuti a {block.id}; non conclude automaticamente il blocco. L’eventuale completamento resta una decisione separata nella Classe.</span>
        </p>

        <label className={styles.note}>
          <span>Una nota, solo se serve</span>
          <textarea name="evidenceNote" maxLength={4000} placeholder="Per esempio: funzione e materiali compresi; tecnica/tecnologia da riprendere." />
        </label>

        <details className={styles.evidence}>
          <summary>Evidenza prevista</summary>
          <strong>{projection.evidence}</strong>
        </details>

        <div className={styles.closeActions}>
          <button className={styles.primary} type="submit">Registra la lezione e torna alla classe</button>
          <Link href={observeHref}>Voglio prima rivedere le evidenze</Link>
          <Link href={teachHref}>Torna alla guida della lezione</Link>
        </div>
      </form>
    </main>
  )
}
