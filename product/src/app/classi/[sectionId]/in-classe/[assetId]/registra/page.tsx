import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { TemporalProjectionService } from '@/core/application/temporal-projection-service'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCalendarProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-calendar-projection-read-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTimetableProjectionReadRepository } from '@/core/infrastructure/supabase/supabase-timetable-projection-read-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildClassroomSessionView } from '../classroom-session-model'
import { recordClassroomLesson } from './actions'
import './lesson-register.css'

export const dynamic = 'force-dynamic'

export default async function LessonRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; assetId: string }>
  searchParams: Promise<{ saved?: string; drive?: string }>
}) {
  const { sectionId, assetId } = await params
  const query = await searchParams
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const [snapshot, bundle, settings] = await Promise.all([
    new SupabaseAnnualPlanExecutionRepository().list(context.workspace.id, context.academicYear.id),
    new SupabaseKnowledgeRepository().getBundle(context.workspace.id, assetId),
    new SupabaseTeacherSettingsRepository().getOrCreate(context.workspace.id, context.academicYear.id),
  ])
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section || !bundle) notFound()
  const view = buildClassroomSessionView(section, bundle.asset)
  if (!view) notFound()

  const localDate = view.targetDate ?? currentRomeDate()
  const occurrence = await findOccurrence({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
    localDate,
  })
  const timeLabel = occurrence?.startAt?.match(/T(\d{2}:\d{2})/)?.[1] ?? null
  const actualMinutes = plannedMinutes(occurrence?.startAt ?? null, occurrence?.endAt ?? null) ?? 60
  const discipline = disciplineLabel(occurrence?.title, bundle.asset.disciplines)
  const udaLabel = metadataString(bundle.asset.sourceMetadata, 'udaLabel')
    ?? metadataString(bundle.asset.sourceMetadata, 'udaTitle')
    ?? 'Percorso didattico in corso'
  const plannedActivity = metadataString(bundle.asset.sourceMetadata, 'plannedActivity') ?? view.title

  return (
    <AppShell
      active="classes"
      academicYearLabel={context.academicYear.label}
      workspaceName={settings.schoolName || context.workspace.name}
      role={context.role}
      contentClassName="lessonRegisterSurface"
    >
      <nav className="lessonRegisterNav" aria-label="Contesto della lezione">
        <Link href={`/classi/${encodeURIComponent(sectionId)}/in-classe/${encodeURIComponent(assetId)}`}>← Torna alla lezione</Link>
        <Link href={`/classi/${encodeURIComponent(sectionId)}`}>Apri classe</Link>
      </nav>

      <header className="lessonRegisterHero">
        <p>DIARIO DEL DOCENTE</p>
        <h1>{view.classLabel} — {discipline}{timeLabel ? ` — ${timeLabel}` : ''}</h1>
        <span>{formatDate(localDate)}</span>
      </header>

      {query.saved ? (
        <section className="lessonRegisterReceipt" role="status">
          <strong>Lezione registrata</strong>
          <p>La registrazione è stata acquisita nella memoria di Docente OS.</p>
          {query.drive === 'queued' ? (
            <p>La copia documentale per Drive è stata accodata con il suo identificativo stabile.</p>
          ) : (
            <p>La copia documentale per Drive è recuperabile dalla registrazione; nessuna evidenza della lezione è andata persa.</p>
          )}
        </section>
      ) : null}

      <section className="lessonRegisterContext" aria-label="Contesto didattico">
        <div>
          <span>UDA / percorso</span>
          <strong>{udaLabel}</strong>
        </div>
        <div>
          <span>Attività prevista</span>
          <strong>{plannedActivity}</strong>
        </div>
        <div className="lessonRegisterMaterial">
          <span>Materiale didattico</span>
          <a href={view.sourceHref} target="_blank" rel="noreferrer">Apri materiale {view.providerLabel} ↗</a>
        </div>
      </section>

      <form action={recordClassroomLesson} className="lessonRegisterForm">
        <input type="hidden" name="sectionId" value={sectionId} />
        <input type="hidden" name="assetId" value={assetId} />

        <div className="lessonRegisterDuration">
          <label htmlFor="actualMinutes">Durata effettiva</label>
          <div><input id="actualMinutes" name="actualMinutes" type="number" min="1" max="1440" defaultValue={actualMinutes} required /><span>minuti</span></div>
        </div>

        <label>
          <span>Che cosa hai svolto?</span>
          <textarea name="activityDone" required maxLength={450} rows={3} placeholder="Attività realmente svolta, anche se diversa da quella prevista." />
        </label>
        <label>
          <span>Che cosa hai osservato?</span>
          <textarea name="observations" maxLength={450} rows={3} placeholder="Risposta della classe, evidenze di apprendimento, aspetti significativi." />
        </label>
        <label>
          <span>Difficoltà?</span>
          <textarea name="difficulties" maxLength={450} rows={3} placeholder="Ostacoli, tempi, passaggi da riprendere o differenze emerse nel gruppo." />
        </label>
        <label>
          <span>Idee emerse?</span>
          <textarea name="ideas" maxLength={450} rows={3} placeholder="Intuizioni, collegamenti, attività o materiali da sviluppare." />
        </label>
        <label>
          <span>Che cosa potrebbe cambiare nell’UDA?</span>
          <textarea name="udaChangeProposal" maxLength={450} rows={3} placeholder="Annota una proposta. Non modifica automaticamente l’UDA." />
        </label>
        <label>
          <span>Qual è la prossima attività?</span>
          <textarea name="nextActivity" maxLength={450} rows={3} placeholder="Passo successivo previsto per questa classe." />
        </label>

        <aside className="lessonRegisterPrivacy">
          <strong>Osservazioni professionali di classe</strong>
          <p>Non inserire nomi degli alunni o dati personali. Le eventuali modifiche all’UDA restano proposte finché non vengono confermate dal docente.</p>
        </aside>

        <button type="submit" className="lessonRegisterSubmit">Registra la lezione</button>
      </form>
    </AppShell>
  )
}

async function findOccurrence(input: { workspaceId: string; academicYearId: string; sectionId: string; localDate: string }) {
  try {
    const day = await new TemporalProjectionService(
      new SupabaseTimetableProjectionReadRepository(),
      new SupabaseCalendarProjectionReadRepository(),
    ).projectDay(input)
    return day.occurrences.find((item) =>
      item.sectionId === input.sectionId && (item.kind === 'LESSON' || item.kind === 'CLASS_PRESENCE'),
    ) ?? null
  } catch {
    return null
  }
}

function plannedMinutes(startAt: string | null, endAt: string | null) {
  if (!startAt || !endAt) return null
  const start = Date.parse(`${startAt}+02:00`)
  const end = Date.parse(`${endAt}+02:00`)
  const minutes = Math.round((end - start) / 60000)
  return Number.isInteger(minutes) && minutes > 0 ? minutes : null
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 600) : null
}

function disciplineLabel(occurrenceTitle: string | undefined, disciplines: string[]) {
  const fromOccurrence = occurrenceTitle?.split('·').map((item) => item.trim()).filter(Boolean).at(-1)
  return fromOccurrence || disciplines[0] || 'Disciplina'
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, day)))
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
