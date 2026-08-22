import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { minutesToTime, slotDurationMinutes, timeToMinutes, TIMETABLE_WEEKDAYS } from '@/core/domain/timetable'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTimetableRepository } from '@/core/infrastructure/supabase/supabase-timetable-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { updateTimetableDraft } from './actions'
import TimetableGrid from './TimetableGrid'
import TimetableTodayFocus from './TimetableTodayFocus'
import './timetable.css'
import './cockpit.css'

export const dynamic = 'force-dynamic'

const GRADE_LABELS = { PRIMA: '1ª', SECONDA: '2ª', TERZA: '3ª' } as const

export default async function TimetablePage() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/')

  const settingsRepository = new SupabaseTeacherSettingsRepository()
  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const timetableRepository = new SupabaseTimetableRepository()
  const [settings, disciplines, annualSnapshot, timetable] = await Promise.all([
    settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
    settingsRepository.listDisciplines(context.workspace.id, context.academicYear.id),
    annualRepository.list(context.workspace.id, context.academicYear.id),
    timetableRepository.list(context.workspace.id, context.academicYear.id, context.academicYear.startsOn),
  ])

  const sectionById = new Map(annualSnapshot.sections.map((section) => [section.id, section]))
  const disciplineById = new Map(disciplines.map((discipline) => [discipline.id, discipline]))
  const slotsByAssignment = new Map<string, number>()
  for (const slot of timetable.slots) {
    if (slot.slotKind !== 'LESSON' || !slot.teachingAssignmentId) continue
    slotsByAssignment.set(
      slot.teachingAssignmentId,
      (slotsByAssignment.get(slot.teachingAssignmentId) ?? 0) + slotDurationMinutes(slot.startTime, slot.endTime),
    )
  }

  const periodPresets = buildPeriods(settings.schoolDayStart, settings.defaultPeriodMinutes, settings.dailyPeriodCount)
  const weekdayOptions = TIMETABLE_WEEKDAYS.filter((day) => settings.teachingWeekdays.includes(day.value))
  const totalAssignedMinutes = timetable.assignments.reduce((sum, assignment) => sum + assignment.weeklyMinutes, 0)
  const totalScheduledMinutes = timetable.slots
    .filter((slot) => slot.slotKind === 'LESSON')
    .reduce((sum, slot) => sum + slotDurationMinutes(slot.startTime, slot.endTime), 0)
  const confirmedAssignments = timetable.assignments.filter((assignment) => assignment.status === 'CONFIRMED').length
  const coverageDelta = totalAssignedMinutes - totalScheduledMinutes
  const gridAssignments = timetable.assignments
    .map((assignment) => {
      const section = sectionById.get(assignment.sectionId)
      const discipline = disciplineById.get(assignment.disciplineId)
      return {
        id: assignment.id,
        label: `${section ? sectionLabel(section.grade, section.sectionCode) : 'Sezione'} · ${discipline?.name ?? 'Disciplina'}`,
        status: assignment.status,
        weeklyMinutes: assignment.weeklyMinutes,
        scheduledMinutes: slotsByAssignment.get(assignment.id) ?? 0,
      }
    })
    .sort((a, b) => Number(b.status === 'CONFIRMED') - Number(a.status === 'CONFIRMED') || a.label.localeCompare(b.label))

  const draftLabel = versionStatusLabel(timetable.draftVersion.status)
  const days = weekdayOptions.map((day) => ({ value: day.value, label: day.label, short: day.short }))

  return (
    <AppShell
      active="timetable"
      academicYearLabel={context.academicYear.label}
      workspaceName={settings.schoolName || context.workspace.name}
      role={context.role}
      contentClassName="timetableSurface"
    >
      <section className="timetableHero">
        <div>
          <p>ORARIO · {context.academicYear.label}</p>
          <h1>Il tuo orario</h1>
          <span>La settimana tipo che usi ogni giorno. Oggi viene messo in primo piano, mentre date, eventi ed eccezioni restano fuori dall’Orario.</span>
        </div>
        <div className="timetableHeroActions">
          <Link className="primary" href="/impostazioni#cattedra">Cattedra</Link>
          <Link href="/impostazioni#organizzazione">Organizzazione</Link>
        </div>
      </section>

      <section className="timetableMetrics" aria-label="Riepilogo dell’orario">
        <article><span>Cattedra</span><strong>{confirmedAssignments}/{timetable.assignments.length}</strong><small>associazioni confermate</small></article>
        <article><span>Monte ore</span><strong>{formatHours(totalAssignedMinutes)}</strong><small>settimanali previste</small></article>
        <article><span>In griglia</span><strong>{formatHours(totalScheduledMinutes)}</strong><small>lezioni ricorrenti</small></article>
        <article><span>Copertura</span><strong>{coverageDelta === 0 ? 'Allineata' : formatHours(Math.abs(coverageDelta))}</strong><small>{coverageDelta > 0 ? 'ancora da collocare' : coverageDelta < 0 ? 'oltre il monte ore' : 'monte ore coperto'}</small></article>
      </section>

      <section className="timetableCard timetableGridCard" aria-labelledby="grid-title">
        <div className="timetableCardHeading"><span>01</span><div><h2 id="grid-title">Settimana tipo</h2><p>La griglia è il centro operativo dell’Orario. Seleziona una cella per aggiungere o modificare una lezione o un altro impegno ricorrente.</p></div><b className="draftBadge">{draftLabel}</b></div>
        <TimetableTodayFocus days={days} slots={timetable.slots} assignments={gridAssignments} />
        <TimetableGrid
          versionId={timetable.draftVersion.id}
          days={days}
          periods={periodPresets}
          slots={timetable.slots}
          assignments={gridAssignments}
        />
      </section>

      <section className="timetableCard timetableCoverageCard" aria-labelledby="coverage-title">
        <div className="timetableCoverageHeader">
          <div className="timetableCardHeading"><span>02</span><div><h2 id="coverage-title">Copertura della cattedra</h2><p>Qui controlli soltanto se le ore della cattedra sono state distribuite nella settimana. La cattedra si modifica nelle Impostazioni.</p></div></div>
          <Link href="/impostazioni#cattedra">Gestisci cattedra</Link>
        </div>

        {gridAssignments.length ? (
          <div className="timetableCoverageList">
            {gridAssignments.map((assignment) => {
              const delta = assignment.weeklyMinutes - assignment.scheduledMinutes
              return (
                <article className="timetableCoverageItem" key={assignment.id}>
                  <div className="timetableCoverageIdentity">
                    <strong>{assignment.label}<span className={`timetableCoverageStatus ${assignment.status === 'CONFIRMED' ? 'confirmed' : ''}`}>{assignment.status === 'CONFIRMED' ? 'Confermata' : 'Da confermare'}</span></strong>
                    <span>{formatHours(assignment.weeklyMinutes)} previste</span>
                  </div>
                  <div className="timetableCoverageValue">
                    <strong>{formatHours(assignment.scheduledMinutes)} in griglia</strong>
                    <span className={delta === 0 ? 'ok' : delta < 0 ? 'over' : ''}>{delta === 0 ? 'Allineata' : delta > 0 ? `Mancano ${formatHours(delta)}` : `Eccesso ${formatHours(Math.abs(delta))}`}</span>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="timetableEmpty"><strong>Prima configura la cattedra</strong><span>Per inserire lezioni nella settimana tipo servono almeno una classe e una disciplina associate.</span><Link href="/impostazioni#cattedra">Configura la cattedra</Link></div>
        )}
      </section>

      <details className="timetableVersionDetails">
        <summary><div><strong>Versione dell’orario · {timetable.draftVersion.label}</strong><span>{draftLabel} · prevista dal {formatDate(timetable.draftVersion.effectiveFrom)}</span></div></summary>
        <div className="timetableVersionDetailsBody">
          <form action={updateTimetableDraft} className="timetableForm versionForm">
            <input type="hidden" name="versionId" value={timetable.draftVersion.id} />
            <label><span>Nome della bozza</span><input name="label" defaultValue={timetable.draftVersion.label} maxLength={160} required /></label>
            <label><span>Prevista dal</span><input name="effectiveFrom" type="date" defaultValue={timetable.draftVersion.effectiveFrom} min={context.academicYear.startsOn} max={context.academicYear.endsOn} required /></label>
            <label><span>Da dove deriva</span><select name="sourceKind" defaultValue={timetable.draftVersion.sourceKind}><option value="MANUAL">Inserimento manuale</option><option value="INSTITUTION_DOCUMENT">Documento istituzionale</option><option value="IMPORT">Importazione</option></select></label>
            <label className="wideField"><span>Riferimento della fonte</span><input name="sourceRef" defaultValue={timetable.draftVersion.sourceRef ?? ''} maxLength={1000} placeholder="Opzionale: circolare, file, nota…" /></label>
            <button className="timetablePrimaryButton" type="submit">Salva versione</button>
          </form>
        </div>
      </details>

      <aside className="timetableContract compact">
        <strong>Orario autonomo</strong>
        <span>Questa pagina descrive solo la struttura ricorrente della settimana. Il Calendario non la controlla e non è necessario per usarla.</span>
      </aside>
    </AppShell>
  )
}

function buildPeriods(startTime: string, durationMinutes: number, count: number) {
  const first = timeToMinutes(startTime)
  return Array.from({ length: count }, (_, index) => ({
    ordinal: index + 1,
    start: minutesToTime(first + index * durationMinutes),
    end: minutesToTime(first + (index + 1) * durationMinutes),
  }))
}

function sectionLabel(grade: keyof typeof GRADE_LABELS, sectionCode: string) {
  return `${GRADE_LABELS[grade]} ${sectionCode}`
}

function versionStatusLabel(value: string) {
  if (value === 'DRAFT') return 'Bozza'
  if (value === 'ACTIVE') return 'Attivo'
  if (value === 'ARCHIVED') return 'Archiviato'
  return value
}

function formatHours(minutes: number) {
  if (!minutes) return '0h'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
