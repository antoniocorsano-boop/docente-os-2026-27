'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  buildLessonWorkspaceHref,
  type HumanTaskLessonProjection,
} from '@/core/presentation/human-task-content'
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
}: {
  sectionId: string
  sectionLabel: string
  block: Block
  projection: HumanTaskLessonProjection
}) {
  const [observed, setObserved] = useState<Record<number, boolean>>({})
  const observedCount = Object.values(observed).filter(Boolean).length
  const classHref = `/classi/${encodeURIComponent(sectionId)}`
  const teachHref = buildLessonWorkspaceHref(sectionId, block.id, 'teach')
  const recordHref = buildLessonWorkspaceHref(sectionId, block.id, 'record')

  return (
    <main className={styles.closeSurface}>
      <section className={styles.closeCard}>
        <div>
          <Link className={styles.back} href={classHref}>← {sectionLabel}</Link>
          <p className={styles.eyebrow}>DOPO / DURANTE · OSSERVAZIONE</p>
          <h1>Guarda poche evidenze utili</h1>
          <p className={styles.closeLead}>Non devi compilare tutto. Usa questi indicatori solo per richiamare l’attenzione su ciò che ti serve per decidere il passo successivo.</p>
        </div>

        <div className={styles.evidence}>
          <span>EVIDENZA ATTESA</span>
          <strong>{projection.evidence}</strong>
        </div>

        <section className={styles.prepChecklist} aria-label="Indicatori di osservazione">
          <div className={styles.prepHeading}><strong>Cosa osservare</strong><span>{observedCount}/{projection.observation.length}</span></div>
          <p className={styles.privacyNote}>Le spunte restano locali a questa schermata e non registrano dati individuali degli alunni.</p>
          {projection.observation.map((item, index) => (
            <label key={item}>
              <input type="checkbox" checked={Boolean(observed[index])} onChange={(event) => setObserved((current) => ({ ...current, [index]: event.target.checked }))} />
              <span>{item}</span>
            </label>
          ))}
        </section>

        <details className={styles.evidence}>
          <summary>Nota sulla valutazione</summary>
          <p className={styles.detailText}>{projection.assessmentNote}</p>
        </details>

        <div className={styles.closeActions}>
          <Link className={styles.primary} href={recordHref}>Chiudi la lezione</Link>
          <Link href={teachHref}>Torna alla guida</Link>
          <Link href={classHref}>Esci senza registrare</Link>
        </div>
      </section>
    </main>
  )
}
