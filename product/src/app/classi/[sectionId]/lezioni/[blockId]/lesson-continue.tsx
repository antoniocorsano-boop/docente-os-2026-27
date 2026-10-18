import Link from 'next/link'
import type { LessonExecutionOutcome } from '../actions'
import styles from './lesson-live.module.css'

const OUTCOME_LABELS: Record<LessonExecutionOutcome, string> = {
  SVOLTO: 'Svolto',
  RECUPERATO: 'Recuperato',
  RIMODULATO: 'Rimodulato',
  ANNULLATO: 'Annullato',
}

export default function LessonContinue({
  sectionId,
  blockId,
  nextBlockId,
  outcome,
  nextActivity,
}: {
  sectionId: string
  blockId: string
  nextBlockId: string | null
  outcome: LessonExecutionOutcome
  nextActivity: string | null
}) {
  const preparationBlockId = outcome === 'SVOLTO' && nextBlockId ? nextBlockId : blockId
  const prepareHref = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(preparationBlockId)}?mode=prepare`

  return (
    <section className={styles.closeCard} aria-labelledby="lesson-continue-title" data-lesson-continue>
      <header className={styles.lessonBriefHeader}>
        <p className={styles.eyebrow}>CONTINUA</p>
        <h2 id="lesson-continue-title">Lezione registrata</h2>
        <p className={styles.closeLead}>La registrazione è confermata. Il Piano annuale non è stato aggiornato automaticamente.</p>
      </header>

      <div className={styles.closeReviewGrid}>
        <div>
          <span>Esito effettivo</span>
          <strong>{OUTCOME_LABELS[outcome]}</strong>
        </div>
        <div>
          <span>Prossima attività</span>
          <strong>{nextActivity || 'Da definire nella prossima preparazione'}</strong>
        </div>
      </div>

      {outcome !== 'SVOLTO' ? (
        <p className={styles.privacyNote}>
          L’esito registrato richiede continuità professionale: DOCENTE OS non avanza automaticamente al blocco successivo.
        </p>
      ) : null}

      <div className={styles.closeStepActions}>
        <Link className={styles.primary} href={prepareHref}>Prepara la prossima</Link>
        <Link href="/planner">Torna a Oggi</Link>
      </div>
    </section>
  )
}
