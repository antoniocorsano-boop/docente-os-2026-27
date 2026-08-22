import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { minutesToTime, slotDurationMinutes, timeToMinutes, TIMETABLE_WEEKDAYS } from '@/core/domain/timetable'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTimetableRepository } from '@/core/infrastructure/supabase/supabase-timetable-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { addTeachingAssignment, updateTeachingAssignment, updateTimetableDraft } from './actions'
import TimetableGrid from './TimetableGrid'
import './timetable.css'

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

  const activeDisciplines = disciplines.filter((item) => item.isActive)
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

  const configuredPairs = new Set(timetable.assignments.map((assignment) => `${assignment.sectionId}:${assignment.disciplineId}`))
  const availablePairCount = annualSnapshot.sections.length * activeDisciplines.length - configuredPairs.size
  const periodPresets = buildPeriods(settings.schoolDayStart, settings.defaultPeriodMinutes, settings.dailyPeriodCount)
  const weekdayOptions = TIMETABLE_WEEKDAYS.filter((day) => settings.teachingWeekdays.includes(day.value))
  const totalAssignedMinutes = timetable.assignments.reduce((sum, assignment) => sum + assignment.weeklyMinutes, 0)
  const totalScheduledMinutes = timetable.slots
    .filter((slot) => slot.slotKind === 'LESSON')
    .reduce((sum, slot) => sum + slotDurationMinutes(slot.startTime, slot.endTime), 0)
  const gridAssignments = timetable.assignments.map((assignment) => {
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

  const draftLabel = versionStatusLabel(timetable.draftVersion.status)

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
          <h1>La tua settimana, in griglia</h1>
          <span>Qui definisci la struttura settimanale ricorrente. L’Orario funziona autonomamente: Calendario, date reali ed eccezioni restano separati e saranno composti solo quando serve.</span>
        </div>
        <Link className="secondaryButton" href="/impostazioni">Modifica impostazioni</Link>
      </section>

      <section className="timetableMetrics" aria-label="Riepilogo dell’orario">
        <article><span>Cattedra</span><strong>{timetable.assignments.length}</strong><small>abbinamenti</small></article>
        <article><span>Monte ore</span><strong>{formatHours(totalAssignedMinutes)}</strong><small>settimanali previste</small></article>
        <article><span>In settimana</span><strong>{formatHours(totalScheduledMinutes)}</strong><small>lezioni già inserite</small></article>
        <article><span>{draftLabel}</span><strong>{timetable.slots.length}</strong><small>attività in griglia</small></article>
      </section>

      <section className="timetableCard timetableGridCard" aria-labelledby="grid-title">
        <div className="timetableCardHeading"><span>01</span><div><h2 id="grid-title">Orario settimanale</h2><p>Passa da Settimana a Giorno. Seleziona una cella vuota per aggiungere un’attività ricorrente oppure una cella occupata per modificarla.</p></div><b className="draftBadge">{draftLabel}</b></div>
        <TimetableGrid
          versionId={timetable.draftVersion.id}
          days={weekdayOptions.map((day) => ({ value: day.value, label: day.label, short: day.short }))}
          periods={periodPresets}
          slots={timetable.slots}
          assignments={gridAssignments}
        />
      </section>

      <section className="timetableCard timetableConfigCard" aria-labelledby="assignments-title">
        <div className="timetableCardHeading"><span>02</span><div><h2 id="assignments-title">Cattedra</h2><p>Associa ogni classe o sezione alla disciplina e indica quante ore settimanali prevedi. DOCENTE OS le confronterà con quelle inserite in griglia.</p></div><b>{availablePairCount > 0 ? `${availablePairCount} combinazioni disponibili` : 'Completa'}</b></div>
        {annualSnapshot.sections.length && activeDisciplines.length ? (
          <form action={addTeachingAssignment} className="timetableForm assignmentForm">
            <label><span>Classe / sezione</span><select name="sectionId" required>{annualSnapshot.sections.map((section) => <option key={section.id} value={section.id}>{sectionLabel(section.grade, section.sectionCode)} · {statusLabel(section.status)}</option>)}</select></label>
            <label><span>Disciplina</span><select name="disciplineId" required>{activeDisciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></label>
            <label><span>Minuti a settimana</span><input name="weeklyMinutes" type="number" min="30" max="2400" step="5" defaultValue="120" required /></label>
            <label className="wideField"><span>Nota o riferimento</span><input name="sourceNote" maxLength={1000} placeholder="Es. assegnazione provvisoria; orario da confermare" /></label>
            <button className="timetablePrimaryButton" type="submit">Aggiungi alla cattedra</button>
          </form>
        ) : <div className="timetableEmpty"><strong>Completa prima le Impostazioni</strong><span>Per costruire la cattedra servono almeno una classe o sezione e una disciplina attiva.</span><Link href="/impostazioni">Apri Impostazioni</Link></div>}

        {timetable.assignments.length ? <div className="assignmentList">{timetable.assignments.map((assignment) => {
          const section = sectionById.get(assignment.sectionId)
          const discipline = disciplineById.get(assignment.disciplineId)
          const scheduled = slotsByAssignment.get(assignment.id) ?? 0
          const delta = assignment.weeklyMinutes - scheduled
          return <article key={assignment.id} className="assignmentRow">
            <div><strong>{section ? sectionLabel(section.grade, section.sectionCode) : 'Sezione'} · {discipline?.name ?? 'Disciplina'}</strong><span>{assignment.status === 'CONFIRMED' ? 'Confermata' : 'Provvisoria'}</span>{assignment.sourceNote && <small>{assignment.sourceNote}</small>}</div>
            <div className="assignmentCapacity"><strong>{scheduled}/{assignment.weeklyMinutes} min</strong><span className={delta === 0 ? 'capacityOk' : delta < 0 ? 'capacityOver' : ''}>{delta === 0 ? 'Allineata' : delta > 0 ? `Mancano ${delta} min` : `Eccesso ${Math.abs(delta)} min`}</span></div>
            <form action={updateTeachingAssignment} className="assignmentEdit"><input type="hidden" name="assignmentId" value={assignment.id} /><input name="weeklyMinutes" type="number" min="30" max="2400" step="5" defaultValue={assignment.weeklyMinutes} aria-label="Minuti settimanali" /><select name="status" defaultValue={assignment.status} aria-label="Stato cattedra"><option value="PROVISIONAL">Provvisoria</option><option value="CONFIRMED">Confermata</option></select><button type="submit">Salva</button></form>
          </article>
        })}</div> : null}
      </section>

      <section className="timetableCard timetableConfigCard" aria-labelledby="draft-title">
        <div className="timetableCardHeading"><span>03</span><div><h2 id="draft-title">Bozza dell’orario</h2><p>Questa è la settimana tipo che stai preparando. La data indica da quando prevedi di usarla; attivazione e versionamento restano funzioni dell’Orario, indipendenti dal Calendario.</p></div><b className="draftBadge">{draftLabel}</b></div>
        <form action={updateTimetableDraft} className="timetableForm versionForm">
          <input type="hidden" name="versionId" value={timetable.draftVersion.id} />
          <label><span>Nome della bozza</span><input name="label" defaultValue={timetable.draftVersion.label} maxLength={160} required /></label>
          <label><span>Prevista dal</span><input name="effectiveFrom" type="date" defaultValue={timetable.draftVersion.effectiveFrom} min={context.academicYear.startsOn} max={context.academicYear.endsOn} required /></label>
          <label><span>Da dove deriva</span><select name="sourceKind" defaultValue={timetable.draftVersion.sourceKind}><option value="MANUAL">Inserimento manuale</option><option value="INSTITUTION_DOCUMENT">Documento istituzionale</option><option value="IMPORT">Importazione</option></select></label>
          <label className="wideField"><span>Riferimento della fonte</span><input name="sourceRef" defaultValue={timetable.draftVersion.sourceRef ?? ''} maxLength={1000} placeholder="Opzionale: circolare, file, nota…" /></label>
          <button className="timetablePrimaryButton" type="submit">Salva la bozza</button>
        </form>
      </section>

      <aside className="timetableContract">
        <strong>Orario e Calendario restano separati</strong>
        <span>Qui modifichi soltanto la struttura ricorrente della settimana. Il Calendario gestirà date ed eventi reali. Un livello di proiezione potrà leggerli insieme senza cambiare nessuno dei due.</span>
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

function statusLabel(value: string) {
  if (value === 'CONFERMATA') return 'confermata'
  if (value === 'PROVVISORIA') return 'provvisoria'
  return 'da confermare'
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
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}
