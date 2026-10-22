import Link from 'next/link'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { buildCanonicalLessonWorkspaceHref } from '@/core/presentation/lesson-workspace-route'
import type { LessonAtlasSuggestion } from './atlas-material-suggestions'
import type { LessonKnowledgeSuggestion } from './lesson-material-suggestions'
import { LessonMaterials } from './lesson-materials'
import { LessonShell } from './lesson-shell'
import styles from './lesson-live.module.css'

export function LessonMaterialsWorkspace({
  sectionId,
  sectionLabel,
  blockId,
  projection,
  extensions,
  knowledgeSuggestions,
  atlasSuggestions,
  localDate,
  occurrenceLogicalId,
  explicitStartIntent,
  statusLabel,
}: {
  sectionId: string
  sectionLabel: string
  blockId: string
  projection: HumanTaskLessonProjection
  extensions: LessonDesignExtension[]
  knowledgeSuggestions: LessonKnowledgeSuggestion[]
  atlasSuggestions: LessonAtlasSuggestion[]
  localDate: string | null
  occurrenceLogicalId: string | null
  explicitStartIntent: boolean
  statusLabel: string
}) {
  const lessonHref = buildCanonicalLessonWorkspaceHref(sectionId, blockId, {
    localDate,
    occurrenceLogicalId,
    intent: explicitStartIntent ? 'start' : null,
  })

  return (
    <main className={styles.closeSurface}>
      <LessonShell
        sectionLabel={sectionLabel}
        disciplineLabel="Tecnologia"
        lessonTitle={projection.title}
        statusLabel={statusLabel}
      />
      <section className={styles.closeCard}>
        <div>
          <p className={styles.eyebrow}>LEZIONE · MATERIALI</p>
          <h2 className={styles.closeHeading}>Materiali della lezione</h2>
          <p className={styles.closeLead}>Consulta o prepara i materiali senza uscire dal contesto della lezione.</p>
        </div>

        <LessonMaterials
          sectionId={sectionId}
          blockId={blockId}
          projectionId={projection.projectionId}
          extensions={extensions}
          knowledgeSuggestions={knowledgeSuggestions}
          atlasSuggestions={atlasSuggestions}
        />

        <div className={styles.closeActions}>
          <Link href={lessonHref}>Torna alla lezione</Link>
        </div>
      </section>
    </main>
  )
}
