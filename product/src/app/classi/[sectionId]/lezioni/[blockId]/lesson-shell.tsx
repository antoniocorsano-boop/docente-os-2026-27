import Link from 'next/link'
import styles from './lesson-shell.module.css'

export function LessonShell({
  sectionLabel,
  disciplineLabel,
  lessonTitle,
  statusLabel,
}: {
  sectionLabel: string
  disciplineLabel: string
  lessonTitle: string
  statusLabel: string
}) {
  return (
    <header className={styles.shell} data-lesson-shell>
      <Link className={styles.back} href="/planner">← Oggi</Link>
      <div className={styles.contextRow}>
        <p className={styles.context}>{sectionLabel} · {disciplineLabel}</p>
        <span className={styles.status}>{statusLabel}</span>
      </div>
      <h1 className={styles.title}>{lessonTitle}</h1>
    </header>
  )
}
