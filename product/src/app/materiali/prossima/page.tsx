import Link from 'next/link'
import { redirect } from 'next/navigation'
import { loadCurrentTodayCopilotContext } from '@/app/api/assistant/today-context-loader'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildLessonPreparationRoleView } from '@/core/presentation/roleview-governance'
import LessonMaterialsClient from './lesson-materials-client'
import { RoleViewTeacherPanel } from './roleview-teacher-panel'
import styles from './lesson-materials.module.css'

export const dynamic = 'force-dynamic'

type MaterialView = 'lim' | 'scheda' | 'docente'

export default async function NextLessonMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>
}) {
  const workspaceContext = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!workspaceContext) redirect('/login')
  if (!workspaceContext.academicYear) redirect('/workspace')

  const loaded = await loadCurrentTodayCopilotContext()
  const preparation = loaded?.preparation ?? null
  const rendering = preparation?.rendering ?? null
  const roleView = preparation
    ? buildLessonPreparationRoleView(preparation.manifest, 'TEACHER')
    : null
  const requestedView = asView((await searchParams).vista)

  return (
    <AppShell
      active="today"
      academicYearLabel={workspaceContext.academicYear.label}
      workspaceName={workspaceContext.workspace.name}
      role={workspaceContext.role}
      contentClassName={styles.shellContent}
    >
      {rendering?.bundle && roleView ? (
        <LessonMaterialsClient
          bundle={rendering.bundle}
          roleView={roleView}
          sectionLabel={preparation?.preparation.canonicalLesson?.sectionLabel ?? 'Classe'}
          timeLabel={formatTimeRange(
            preparation?.preparation.lesson.startAt ?? '',
            preparation?.preparation.lesson.endAt ?? '',
          )}
          authority={preparation?.preparation.lesson.authority ?? 'IN_FORCE'}
          initialView={requestedView}
        />
      ) : (
        <main className={styles.emptySurface}>
          <p className={styles.eyebrow}>MATERIALI DELLA PROSSIMA LEZIONE</p>
          {roleView?.status === 'BLOCKED' ? (
            <>
              <h1>Preparazione della prossima lezione</h1>
              <RoleViewTeacherPanel roleView={roleView} />
            </>
          ) : (
            <>
              <h1>La preparazione non è disponibile con sufficiente certezza.</h1>
              <p>
                DOCENTE OS non genera una vista LIM o una scheda se la prossima lezione, il Piano o il Lesson Brief non sono risolti in modo coerente.
              </p>
              {rendering?.reasons.length ? (
                <ul>{rendering.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              ) : null}
              <Link className={styles.primaryLink} href="/planner">Torna a Oggi</Link>
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
  if (!startAt || !endAt) return ''
  return `${startAt.slice(11, 16)}–${endAt.slice(11, 16)}`
}
