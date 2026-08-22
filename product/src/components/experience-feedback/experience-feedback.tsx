'use client'

import { useActionState } from 'react'
import {
  INITIAL_EXPERIENCE_FEEDBACK_STATE,
  submitLessonExperienceFeedback,
} from '@/app/feedback/actions'
import styles from './experience-feedback.module.css'

const OPTIONS = [
  { value: 5, label: 'Molto bene' },
  { value: 4, label: 'Bene' },
  { value: 3, label: 'Né bene né male' },
  { value: 2, label: 'Male' },
  { value: 1, label: 'Molto male' },
] as const

export function LessonExperienceFeedback({
  sectionId,
  blockId,
}: {
  sectionId: string
  blockId: string
}) {
  const [state, action, pending] = useActionState(
    submitLessonExperienceFeedback,
    INITIAL_EXPERIENCE_FEEDBACK_STATE,
  )

  if (state.status === 'success') {
    return <p className={styles.success} role="status">{state.message}</p>
  }

  return (
    <details className={styles.feedback}>
      <summary>Com’è andato questo flusso?</summary>
      <form action={action} className={styles.form}>
        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="blockId" value={blockId} />

        <fieldset className={styles.rating}>
          <legend>Quanto è stato facile arrivare dalla preparazione alla registrazione?</legend>
          <div>
            {OPTIONS.map((option) => (
              <label key={option.value}>
                <input type="radio" name="satisfaction" value={option.value} required />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className={styles.comment}>
          <span>Cosa potremmo migliorare? <small>facoltativo</small></span>
          <textarea
            name="comment"
            rows={3}
            maxLength={1500}
            placeholder="Per esempio: un passaggio poco chiaro, qualcosa che manca o che potremmo togliere…"
          />
        </label>

        <p className={styles.privacy}>Non inserire nomi di alunni o altri dati personali. Il sistema collega automaticamente il feedback al punto del percorso appena concluso.</p>

        {state.status === 'error' ? <p className={styles.error} role="alert">{state.message}</p> : null}

        <button type="submit" disabled={pending}>{pending ? 'Invio…' : 'Invia feedback'}</button>
      </form>
    </details>
  )
}
