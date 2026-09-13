'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { recordLessonTeachingSession } from '../actions'
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
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  progress: Progress
}) {
  const suggestedMinutes = Math.max(1, Math.round(projection.durationMinutes || 60))
  const [actualMinutes, setActualMinutes] = useState(suggestedMinutes)
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const teachHref = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(block.id)}?mode=teach`
  const observeHref = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(block.id)}?mode=observe`
  const planAlreadyClosed = progress.status === 'SVOLTO' || progress.status === 'RECUPERATO' || progress.status === 'RIMODULATO'

  return (
    <main className={styles.closeSurface}>
      <form
        action={recordLessonTeachingSession}
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
          <p className={styles.closeLead}>Conferma soltanto la durata effettiva e, se serve, una nota. DOCENTE OS registra una TeachingSession reale e attribuisce questi minuti a {block.id}; il Piano annuale non viene segnato automaticamente come concluso.</p>
          {planAlreadyClosed ? <p className={styles.closeLead}>Il Piano riporta già {block.id} come concluso. Questa registrazione aggiunge evidenza dell’attività reale senza modificarne automaticamente lo stato.</p> : null}
        </div>

        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="blockId" value={block.id} />

        <label className={styles.note}>
          <span>Minuti realmente svolti</span>
          <input
            name="actualMinutes"
            type="number"
            min="1"
            max="1440"
            required
            value={actualMinutes}
            onChange={(event) => setActualMinutes(Number(event.target.value))}
          />
          <small>Durata prevista dalla lezione: {projection.durationMinutes} min. Puoi correggerla prima di registrare.</small>
        </label>

        <label className={styles.note}>
          <span>Una nota, solo se serve</span>
          <textarea name="evidenceNote" maxLength={4000} placeholder="Per esempio: attività rimodulata; concetto da riprendere; prodotto completato." />
        </label>

        <details className={styles.evidence}>
          <summary>Evidenza prevista</summary>
          <strong>{projection.evidence}</strong>
        </details>

        <div className={styles.closeActions}>
          <button className={styles.primary} type="submit">Registra la lezione</button>
          <Link href={observeHref}>Voglio prima rivedere le evidenze</Link>
          <Link href={teachHref}>Torna alla guida della lezione</Link>
        </div>
      </form>
    </main>
  )
}
