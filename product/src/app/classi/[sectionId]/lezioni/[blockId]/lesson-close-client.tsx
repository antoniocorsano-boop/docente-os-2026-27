'use client'

import Link from 'next/link'
import { useState } from 'react'
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
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
  progress: Progress
}) {
  const [status, setStatus] = useState(recordableDefault(progress.status))
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const teachHref = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(block.id)}?mode=teach`
  const observeHref = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(block.id)}?mode=observe`
  const recorded = progress.status === 'SVOLTO' || progress.status === 'RECUPERATO' || progress.status === 'RIMODULATO'

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
          <p className={styles.eyebrow}>CHIUSURA RAPIDA · {sectionLabel}</p>
          <h1>{recorded ? 'Aggiorna la registrazione' : 'Chiudi in meno di un minuto'}</h1>
          <p className={styles.closeLead}>Scegli soltanto ciò che descrive davvero la lezione. La nota è facoltativa: non devi ricopiare obiettivi, sequenza o materiali già presenti nel sistema.</p>
        </div>

        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="blockId" value={block.id} />
        <input type="hidden" name="status" value={status} />

        <div className={styles.choiceGroup} role="radiogroup" aria-label="Esito della lezione">
          <label className={styles.choice}>
            <input type="radio" checked={status === 'SVOLTO'} onChange={() => setStatus('SVOLTO')} />
            <span><strong>Svolta come prevista</strong><small>Il blocco può essere considerato concluso.</small></span>
          </label>
          <label className={styles.choice}>
            <input type="radio" checked={status === 'RIMODULATO'} onChange={() => setStatus('RIMODULATO')} />
            <span><strong>Ho rimodulato</strong><small>La lezione è stata svolta, ma tempi, attività o percorso sono cambiati.</small></span>
          </label>
          <label className={styles.choice}>
            <input type="radio" checked={status === 'RECUPERATO'} onChange={() => setStatus('RECUPERATO')} />
            <span><strong>Era una lezione di recupero</strong><small>Usa questa voce solo quando il blocco è stato effettivamente svolto come recupero.</small></span>
          </label>
        </div>

        <label className={styles.note}>
          <span>Una nota, solo se serve</span>
          <textarea name="evidenceNote" maxLength={2000} defaultValue={progress.evidenceNote ?? ''} placeholder="Per esempio: funzione e materiali compresi; tecnica/tecnologia da riprendere." />
        </label>

        <details className={styles.evidence}>
          <summary>Evidenza prevista</summary>
          <strong>{projection.evidence}</strong>
        </details>

        <div className={styles.closeActions}>
          <button className={styles.primary} type="submit">{recorded ? 'Aggiorna e torna alla classe' : 'Salva e prepara il prossimo passo'}</button>
          <Link href={observeHref}>Voglio prima rivedere le evidenze</Link>
          <Link href={teachHref}>Torna alla guida della lezione</Link>
        </div>
      </form>
    </main>
  )
}

function recordableDefault(status: string): 'SVOLTO' | 'RIMODULATO' | 'RECUPERATO' {
  if (status === 'RIMODULATO' || status === 'RECUPERATO' || status === 'SVOLTO') return status
  return 'SVOLTO'
}
