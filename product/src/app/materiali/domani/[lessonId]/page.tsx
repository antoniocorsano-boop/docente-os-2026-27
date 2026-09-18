import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { toLessonReplanningDisplayProjection } from '@/core/presentation/lesson-replanning-decision'
import { buildLessonPreparationRoleView } from '@/core/presentation/roleview-governance'
import LessonMaterialsClient from '../../prossima/lesson-materials-client'
import { RoleViewTeacherPanel } from '../../prossima/roleview-teacher-panel'
import styles from '../../prossima/lesson-materials.module.css'
import { loadTomorrowPreparationBundle } from '../tomorrow-preparation-loader'

export const dynamic = 'force-dynamic'

type MaterialView = 'lim' | 'scheda' | 'docente'

export default async function TomorrowLessonMaterialsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>
  searchParams: Promise<{ vista?: string }>
}) {
  const workspaceContext = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!workspaceContext) redirect('/login')
  if (!workspaceContext.academicYear) redirect('/workspace')

  const [{ lessonId }, query] = await Promise.all([params, searchParams])
  const tomorrow = await loadTomorrowPreparationBundle({
    workspaceId: workspaceContext.workspace.id,
    academicYearId: workspaceContext.academicYear.id,
  })
  const entry = tomorrow.entries.find((item) => item.logicalId === lessonId) ?? null
  const roleView = entry ? buildLessonPreparationRoleView(entry.loaded.manifest, 'TEACHER') : null
  const rendering = entry?.loaded.rendering ?? null
  const preparation = entry?.loaded.preparation ?? null

  return (
    <AppShell
      active="today"
      academicYearLabel={workspaceContext.academicYear.label}
      workspaceName={workspaceContext.workspace.name}
      role={workspaceContext.role}
      contentClassName={styles.shellContent}
    >
      {rendering?.bundle && roleView && preparation ? (
        <LessonMaterialsClient
          bundle={rendering.bundle}
          roleView={roleView}
          sectionLabel={preparation.canonicalLesson?.sectionLabel ?? preparation.lesson.title}
          timeLabel={formatTimeRange(preparation.lesson.startAt, preparation.lesson.endAt)}
          authority={preparation.lesson.authority}
          initialView={asView(query.vista)}
          replanning={entry?.loaded.manifest.resolution === 'BLOCKED' || !entry?.loaded.manifest.manifest.replanning
            ? undefined
            : toLessonReplanningDisplayProjection(entry.loaded.manifest.manifest.replanning)}
          eyebrow="MATERIALI DI DOMANI"
          backHref="/materiali/domani"
          backLabel="← Tutte le lezioni di domani"
        />
      ) : (
        <main className={styles.emptySurface}>
          <p className={styles.eyebrow}>MATERIALI DI DOMANI</p>
          {roleView?.status === 'BLOCKED' ? (
            <>
              <h1>Questa lezione non è ancora pronta.</h1>
              <RoleViewTeacherPanel roleView={roleView} />
              <Link className={styles.back} href="/materiali/domani">← Tutte le lezioni di domani</Link>
            </>
          ) : (
            <>
              <h1>Il pacchetto richiesto non è disponibile.</h1>
              <p>
                La lezione potrebbe non appartenere più all’orario di domani oppure il contesto temporale non è più determinabile con sufficiente certezza.
              </p>
              {tomorrow.reasons.length ? (
                <ul>{tomorrow.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              ) : null}
              <Link className={styles.primaryLink} href="/materiali/domani">Torna ai materiali di domani</Link>
            </>
          )}
        </main>
      )}
    </AppShell>
  )
}

function asView(value: string | undefined): MaterialView {
  if (value === 'scheda' || value === 'docente') return value
  return 'lim'
}

function formatTimeRange(startAt: string, endAt: string) {
  return `${startAt.slice(11, 16)}–${endAt.slice(11, 16)}`
}
