import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import styles from '../../materiali/prossima/lesson-materials.module.css'
import { loadDayReviewBundle } from './day-review-loader'

export const dynamic = 'force-dynamic'

export default async function DayReviewPage() {
  const workspaceContext = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!workspaceContext) redirect('/login')
  if (!workspaceContext.academicYear) redirect('/workspace')

  const review = await loadDayReviewBundle({
    workspaceId: workspaceContext.workspace.id,
    academicYearId: workspaceContext.academicYear.id,
  })
  const primaryDecision = review.decisions[0] ?? null

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
            <p className={styles.eyebrow}>RESOCONTO DELLA GIORNATA</p>
            <h1>Chiudi oggi, prepara domani</h1>
            <p className={styles.contextLine}>
              {formatLocalDate(review.localDate)} · il sistema legge Diario, Orario e pacchetti di domani senza applicare modifiche automatiche.
            </p>
          </div>
        </header>

        {primaryDecision ? (
          <section className="humanTaskFocus" aria-labelledby="day-review-focus-title">
            <p className="humanTaskFocusEyebrow">PROSSIMA DECISIONE</p>
            <h2 id="day-review-focus-title">{primaryDecision.title}</h2>
            <p>{primaryDecision.detail}</p>
            <div className="humanTaskActions">
              <Link className="primary" href={primaryDecision.href}>{primaryDecision.actionLabel}</Link>
            </div>
          </section>
        ) : (
          <section className="humanTaskFocus" aria-labelledby="day-review-clear-title">
            <p className="humanTaskFocusEyebrow">GIORNATA ALLINEATA</p>
            <h2 id="day-review-clear-title">Non risultano decisioni didattiche pendenti</h2>
            <p>Le lezioni concluse risultano registrate e i pacchetti determinabili di domani non richiedono interventi del docente.</p>
            <div className="humanTaskActions">
              <Link className="primary" href="/materiali/domani">Apri i materiali di domani</Link>
            </div>
          </section>
        )}

        <div className="humanTaskCompactStats" aria-label="Stato chiusura giornata">
          <span><strong>{review.today.recordedCount}/{review.today.concludedCount}</strong> lezioni registrate</span>
          <span><strong>{review.today.pendingCount}</strong> da registrare</span>
          <span><strong>{review.tomorrow.readyCount}/{review.tomorrow.lessonCount}</strong> pacchetti pronti</span>
          <span><strong>{review.decisions.length}</strong> decisioni aperte</span>
        </div>

        <details className="humanTaskSecondary" open>
          <summary>Oggi · lezioni concluse</summary>
          <div className="humanTaskSecondaryBody">
            {review.today.concluded.length ? (
              <div className={styles.teacherGrid}>
                {review.today.concluded.map((lesson) => (
                  <article className={styles.teacherCard} key={lesson.logicalId}>
                    <p className={styles.eyebrow}>{lesson.timeLabel} · {lesson.recorded ? 'REGISTRATA' : 'DA REGISTRARE'}</p>
                    <h2>{lesson.title}</h2>
                    <p>{lesson.recorded ? 'La lezione è già entrata nel Diario.' : 'La lezione è conclusa ma manca ancora la registrazione didattica.'}</p>
                    <Link
                      className={styles.primaryLink}
                      href={lesson.sectionId ? `/classi/${encodeURIComponent(lesson.sectionId)}${lesson.recorded ? '/diario' : ''}` : '/classi'}
                    >
                      {lesson.recorded ? 'Apri il Diario' : 'Apri la classe'}
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <p>Non risultano ancora lezioni concluse oggi.</p>
            )}
            {review.today.remainingCount > 0 ? <p>Restano {review.today.remainingCount} lezioni o presenze da concludere oggi.</p> : null}
          </div>
        </details>

        <details className="humanTaskSecondary" open={review.today.reflections.length > 0}>
          <summary>Dal Diario · continuità e idee emerse</summary>
          <div className="humanTaskSecondaryBody">
            {review.today.reflections.length ? (
              <div className={styles.teacherGrid}>
                {review.today.reflections.map((entry) => (
                  <article className={styles.teacherCard} key={entry.sessionId}>
                    <p className={styles.eyebrow}>{entry.timeLabel ?? 'LEZIONE'} · {entry.lessonTitle}</p>
                    {entry.reflection.nextActivity ? <p><strong>Prossima attività:</strong> {entry.reflection.nextActivity}</p> : null}
                    {entry.reflection.ideas ? <p><strong>Idea emersa:</strong> {entry.reflection.ideas}</p> : null}
                    {entry.reflection.udaChangeProposal ? <p><strong>Proposta UDA:</strong> {entry.reflection.udaChangeProposal}</p> : null}
                    <Link className={styles.primaryLink} href={`/classi/${encodeURIComponent(entry.sectionId)}/diario`}>Apri il Diario</Link>
                  </article>
                ))}
              </div>
            ) : (
              <p>Le registrazioni di oggi non contengono ancora riflessioni strutturate da riportare nel passaggio a domani.</p>
            )}
          </div>
        </details>

        <details className="humanTaskSecondary" open>
          <summary>Domani · pacchetti delle lezioni</summary>
          <div className="humanTaskSecondaryBody">
            {review.tomorrow.reasons.length ? (
              <div>
                <p>La preparazione complessiva di domani richiede una verifica temporale.</p>
                <ul>{review.tomorrow.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              </div>
            ) : review.tomorrow.entries.length ? (
              <div className={styles.teacherGrid}>
                {review.tomorrow.entries.map((entry) => (
                  <article className={styles.teacherCard} key={entry.logicalId}>
                    <p className={styles.eyebrow}>{entry.timeLabel} · {statusLabel(entry.status)}</p>
                    <h2>{entry.title}</h2>
                    <p className={styles.contextLine}><strong>{entry.sectionLabel}</strong></p>
                    {entry.nextActivity ? <p>Ripresa dal Diario: {entry.nextActivity}</p> : null}
                    <Link className={styles.primaryLink} href={entry.href}>Apri pacchetto</Link>
                  </article>
                ))}
              </div>
            ) : (
              <p>Domani non risultano lezioni da predisporre.</p>
            )}
            <div className="humanTaskActions"><Link href="/materiali/domani">Apri la vista completa dei materiali di domani</Link></div>
          </div>
        </details>

        {review.decisions.length > 1 ? (
          <details className="humanTaskSecondary">
            <summary>Altre decisioni aperte · {review.decisions.length - 1}</summary>
            <div className="humanTaskSecondaryBody taskSections">
              {review.decisions.slice(1).map((decision) => (
                <article className="taskRow" key={decision.id}>
                  <div className="taskBody">
                    <h3>{decision.title}</h3>
                    <p>{decision.detail}</p>
                    <div className="taskInlineActions"><Link href={decision.href}>{decision.actionLabel}</Link></div>
                  </div>
                </article>
              ))}
            </div>
          </details>
        ) : null}
      </main>
    </AppShell>
  )
}

function statusLabel(status: 'READY' | 'ATTENTION' | 'BLOCKED') {
  if (status === 'READY') return 'PRONTA'
  if (status === 'ATTENTION') return 'DA COMPLETARE'
  return 'BLOCCATA'
}

function formatLocalDate(localDate: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${localDate}T12:00:00Z`))
}
