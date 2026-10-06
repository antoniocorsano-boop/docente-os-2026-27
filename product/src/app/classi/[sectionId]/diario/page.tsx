import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { currentTeachingSessions } from '@/core/domain/teaching-session'
import { parseTeachingSessionEvidenceNote } from '@/core/domain/teaching-session-reflection'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTeachingSessionDriveOutboxRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-drive-outbox-repository'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import './diario.css'

export const dynamic = 'force-dynamic'

const GRADE_NUMBER: Record<string, string> = { PRIMA: '1', SECONDA: '2', TERZA: '3' }

export default async function ClassDiaryPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const { sectionId } = await params
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const [annualSnapshot, settings, teachingSnapshot, driveReceipts] = await Promise.all([
    new SupabaseAnnualPlanExecutionRepository().list(context.workspace.id, context.academicYear.id),
    new SupabaseTeacherSettingsRepository().getOrCreate(context.workspace.id, context.academicYear.id),
    new SupabaseTeachingSessionRepository().listBySection(context.workspace.id, context.academicYear.id, sectionId),
    new SupabaseTeachingSessionDriveOutboxRepository().listBySection(context.workspace.id, sectionId).catch(() => []),
  ])

  const section = annualSnapshot.sections.find((item) => item.id === sectionId)
  if (!section) notFound()

  const classLabel = `${GRADE_NUMBER[section.grade] ?? section.grade}ª ${section.sectionCode}`
  const sessions = currentTeachingSessions(teachingSnapshot)
  const receiptBySession = new Map(driveReceipts.map((receipt) => [receipt.sessionId, receipt]))
  const driveSpreadsheetId = process.env.DOCENTE_OS_DIARY_SPREADSHEET_ID?.trim() || null
  const driveHref = driveSpreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(driveSpreadsheetId)}/edit`
    : null

  return (
    <AppShell
      active="classes"
      academicYearLabel={context.academicYear.label}
      workspaceName={settings.schoolName || context.workspace.name}
      role={context.role}
      contentClassName="classDiarySurface"
    >
      <nav className="classDiaryNav" aria-label="Contesto della classe">
        <Link href={`/classi/${encodeURIComponent(sectionId)}`}>← Torna alla classe</Link>
        {driveHref ? <a href={driveHref} target="_blank" rel="noreferrer">Apri registro Drive ↗</a> : null}
      </nav>

      <header className="classDiaryHero">
        <p>DIARIO DEL DOCENTE</p>
        <h1>{classLabel}</h1>
        <span>Cosa hai svolto, cosa hai osservato e da dove ripartire alla prossima lezione.</span>
      </header>

      {sessions.length ? (
        <section className="classDiaryTimeline" aria-label="Lezioni registrate">
          {sessions.map((session) => {
            const parsed = parseTeachingSessionEvidenceNote(session.evidenceNote)
            const receipt = receiptBySession.get(session.id) ?? null
            const projection = receipt?.projection ?? null
            const materialHref = parsed?.materialAssetId
              ? `/classi/${encodeURIComponent(sectionId)}/in-classe/${encodeURIComponent(parsed.materialAssetId)}`
              : null
            const reflection = parsed?.reflection ?? null
            const hasSecondaryReflection = Boolean(
              reflection?.observations
              || reflection?.difficulties
              || reflection?.ideas
              || reflection?.udaChangeProposal,
            )

            return (
              <article className="classDiaryEntry" key={session.id}>
                <header>
                  <div>
                    <p>{formatDate(session.localDate)}{timeLabel(session.plannedStartAt) ? ` · ${timeLabel(session.plannedStartAt)}` : ''}</p>
                    <h2>{projection?.plannedActivity || reflection?.activityDone || 'Attività registrata'}</h2>
                    <span>{session.actualMinutes} minuti effettivi{projection?.udaLabel ? ` · ${projection.udaLabel}` : ''}</span>
                  </div>
                  <strong className={`classDiarySync ${receipt?.status?.toLowerCase() ?? 'local'}`}>
                    {driveStatusLabel(receipt?.status ?? null)}
                  </strong>
                </header>

                {reflection ? (
                  <>
                    {reflection.activityDone ? (
                      <div className="classDiaryDone">
                        <span>SVOLTO</span>
                        <p>{reflection.activityDone}</p>
                      </div>
                    ) : null}

                    {reflection.nextActivity ? (
                      <p className="classDiaryNext">
                        <span>DA RIPRENDERE</span>
                        <strong>{reflection.nextActivity}</strong>
                      </p>
                    ) : null}

                    {hasSecondaryReflection ? (
                      <details className="classDiaryDetailsDisclosure">
                        <summary>Osservazioni della lezione</summary>
                        <div className="classDiaryDetails">
                          <DiaryField label="Osservato" value={reflection.observations} />
                          <DiaryField label="Difficoltà" value={reflection.difficulties} />
                          <DiaryField label="Idea emersa" value={reflection.ideas} />
                          <DiaryField label="Proposta per l’UDA" value={reflection.udaChangeProposal} />
                        </div>
                      </details>
                    ) : null}
                  </>
                ) : session.evidenceNote ? (
                  <p className="classDiaryLegacyNote">{session.evidenceNote}</p>
                ) : (
                  <p className="classDiaryLegacyNote">Registrazione quantitativa senza nota professionale.</p>
                )}

                {materialHref ? (
                  <footer>
                    <Link href={materialHref}>Apri attività / materiale</Link>
                  </footer>
                ) : null}
              </article>
            )
          })}
        </section>
      ) : (
        <section className="classDiaryEmpty">
          <strong>Il Diario della classe è pronto.</strong>
          <p>Non risultano ancora lezioni registrate. La prima registrazione comparirà qui senza dover ricopiare il contenuto dal foglio Drive.</p>
          <Link href={`/classi/${encodeURIComponent(sectionId)}`}>Apri la classe</Link>
        </section>
      )}

      <details className="classDiarySupport">
        <summary>Come funziona il salvataggio</summary>
        <p>Le lezioni restano nel Diario. Se hai collegato un registro Drive, lo stato di aggiornamento è indicato accanto a ogni lezione.</p>
        <p>Le proposte di modifica all’UDA restano separate finché non le confermi.</p>
      </details>
    </AppShell>
  )
}

function DiaryField({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return <div><span>{label}</span><p>{value}</p></div>
}

function driveStatusLabel(status: 'PENDING' | 'SYNCED' | 'FAILED' | null) {
  if (status === 'SYNCED') return 'Drive aggiornato'
  if (status === 'PENDING') return 'Drive in attesa'
  if (status === 'FAILED') return 'Drive da riprovare'
  return 'Solo Docente OS'
}

function timeLabel(value: string | null) {
  return value?.match(/T(\d{2}:\d{2})/)?.[1] ?? null
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}
