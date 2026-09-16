import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildLessonPreparationRoleView, type RoleViewSnapshot } from '@/core/presentation/roleview-governance'
import styles from '../prossima/lesson-materials.module.css'
import { loadTomorrowPreparationBundle } from './tomorrow-preparation-loader'

export const dynamic = 'force-dynamic'

export default async function TomorrowMaterialsPage() {
  const workspaceContext = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!workspaceContext) redirect('/login')
  if (!workspaceContext.academicYear) redirect('/workspace')

  const tomorrow = await loadTomorrowPreparationBundle({
    workspaceId: workspaceContext.workspace.id,
    academicYearId: workspaceContext.academicYear.id,
  })

  return (
    <AppShell
      active="today"
      academicYearLabel={workspaceContext.academicYear.label}
      workspaceName={workspaceContext.workspace.name}
      role={workspaceContext.role}
      contentClassName={styles.shellContent}
    >
      <main className={styles.surface}>
        <header className={styles.header}>
          <div>
            <Link className={styles.back} href="/planner">← Oggi</Link>
            <p className={styles.eyebrow}>MATERIALI DI DOMANI</p>
            <h1>Lezioni predisposte per {formatLocalDate(tomorrow.localDate)}</h1>
            <p className={styles.contextLine}>
              {tomorrow.authority === 'PROVISIONAL_DRAFT'
                ? 'Orario provvisorio · ogni pacchetto resta esplicitamente da confermare.'
                : 'Pacchetti costruiti dai dati già governati di Piano, Diario e Lesson Brief.'}
            </p>
          </div>
        </header>

        {tomorrow.reasons.length ? (
          <section className={styles.emptyMessage} aria-labelledby="tomorrow-blocked-title">
            <h2 id="tomorrow-blocked-title">Non posso predisporre le lezioni di domani con sufficiente certezza.</h2>
            <ul>{tomorrow.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          </section>
        ) : tomorrow.entries.length === 0 ? (
          <section className={styles.emptyMessage} aria-labelledby="tomorrow-empty-title">
            <h2 id="tomorrow-empty-title">Domani non risultano lezioni da predisporre.</h2>
            <p>Il sistema non crea pacchetti se il calendario non prevede lezioni o non restituisce attività didattiche.</p>
          </section>
        ) : (
          <section className={styles.teacherView} aria-label="Lezioni di domani">
            <div className={styles.teacherGrid}>
              {tomorrow.entries.map((entry) => {
                const preparation = entry.loaded.preparation
                const roleView = buildLessonPreparationRoleView(entry.loaded.manifest, 'TEACHER')
                const canonical = preparation.canonicalLesson
                return (
                  <article className={styles.teacherCard} key={entry.logicalId}>
                    <p className={styles.eyebrow}>{formatTime(preparation.lesson.startAt)} · {statusLabel(roleView.status)}</p>
                    <h2>{canonical?.title ?? preparation.lesson.title}</h2>
                    <p className={styles.contextLine}>
                      <strong>{canonical?.sectionLabel ?? preparation.lesson.title}</strong>
                      {canonical?.udaTitle ? ` · ${canonical.udaTitle}` : ''}
                    </p>
                    {preparation.continuity ? (
                      <p>Ripresa dal Diario: {preparation.continuity.nextActivity}</p>
                    ) : null}
                    <Link className={styles.primaryLink} href={`/materiali/domani/${encodeURIComponent(entry.logicalId)}`}>
                      Apri pacchetto
                    </Link>
                  </article>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </AppShell>
  )
}

function statusLabel(status: RoleViewSnapshot['status']) {
  if (status === 'READY') return 'Pronta'
  if (status === 'ATTENTION') return 'Da completare'
  return 'Bloccata'
}

function formatTime(value: string) {
  return value.slice(11, 16)
}

function formatLocalDate(localDate: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Rome',
  }).format(new Date(`${localDate}T12:00:00Z`))
}
