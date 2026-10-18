import Link from 'next/link'
import styles from './lesson-shell.module.css'

export type LessonShellPhase = 'prepare' | 'teach' | 'observe' | 'record'

const PHASES: Array<{ id: LessonShellPhase; label: string }> = [
  { id: 'prepare', label: 'Prepara' },
  { id: 'teach', label: 'Conduci' },
  { id: 'observe', label: 'Osserva' },
  { id: 'record', label: 'Registra' },
]

export function LessonShell({
  sectionId,
  blockId,
  sectionLabel,
  disciplineLabel,
  lessonTitle,
  phase,
}: {
  sectionId: string
  blockId: string
  sectionLabel: string
  disciplineLabel: string
  lessonTitle: string
  phase: LessonShellPhase
}) {
  return (
    <header className={styles.shell} data-lesson-shell>
      <Link className={styles.back} href="/planner">← Oggi</Link>
      <p className={styles.context}>{sectionLabel} · {disciplineLabel}</p>
      <h1 className={styles.title}>{lessonTitle}</h1>
      <nav className={styles.phases} aria-label="Fasi della lezione">
        {PHASES.map((item) => (
          <Link
            key={item.id}
            href={buildPhaseHref(sectionId, blockId, item.id)}
            data-lesson-phase={item.id}
            aria-current={item.id === phase ? 'step' : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

function buildPhaseHref(sectionId: string, blockId: string, phase: LessonShellPhase) {
  return `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(blockId)}?mode=${phase}`
}
