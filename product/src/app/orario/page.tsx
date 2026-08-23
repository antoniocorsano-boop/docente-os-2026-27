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
import './timetable.css'
import './orario-guidance.css'

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
    slotsByAssignment.set(slot.teachingAssignmentId, (slotsByAssignment.get(slot.teachingAssignmentId) ?? 0) + slotDurationMinutes(slot.startTime, slot.endTime))
  }

  const periodPresets = buildPeriods(settings.schoolDayStart, settings.defaultPeriodMinutes, settings.dailyPeriodCount)
  const weekdayOptions = TIMETABLE_WEEKDAYS.filter((day) => settings.teachingWeekdays.includes(day.value))
  const totalAssignedMinutes = timetable.assignments.reduce((sum, assignment) => sum + assignment.weeklyMinutes, 0)
  const totalScheduledMinutes = timetable.slots.filter((slot) => slot.slotKind === 'LESSON').reduce((sum, slot) => sum + slotDurationMinutes(slot.startTime, slot.endTime), 0)
  const confirmedAssignments = timetable.assignments.filter((assignment) => assignment.status === 'CONFIRMED').length
  const coverageDelta = totalAssignedMinutes - totalScheduledMinutes
  const gridAssignments = timetable.assignments.map((assignment) => {
    const section = sectionById.get(assignment.sectionId)
    const discipline = disciplineById.get(assignment.disciplineId)
    const classLabel = section ? sectionLabel(section.grade, section.sectionCode) : 'Sezione'
    const disciplineLabel = discipline?.name ?? 'Disciplina'
    return { id: assignment.id, sectionId: assignment.sectionId, label: `${classLabel} · ${disciplineLabel}`, classLabel, disciplineLabel, status: assignment.status, weeklyMinutes: assignment.weeklyMinutes, scheduledMinutes: slotsByAssignment.get(assignment.id) ?? 0 }
  }).sort((a, b) => Number(b.status === 'CONFIRMED') - Number(a.status === 'CONFIRMED') || a.label.localeCompare(b.label))

  const draftLabel = versionStatusLabel(timetable.draftVersion.status)
  const days = weekdayOptions.map((day) => ({ value: day.value, label: day.label, short: day.short }))
  const moment = currentRomeMoment()
  const todaySlots = timetable.slots.filter((slot) => slot.weekday === moment.weekday).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  const currentSlot = todaySlots.find((slot) => timeToMinutes(slot.startTime) <= moment.minutes && timeToMinutes(slot.endTime) > moment.minutes) ?? null
  const nextSlot = currentSlot ?? todaySlots.find((slot) => timeToMinutes(slot.startTime) > moment.minutes) ?? null
  const focusSlot = nextSlot ? describeSlot(nextSlot, sectionById, disciplineById) : null

  return (
    <AppShell active="timetable" academicYearLabel={context.academicYear.label} workspaceName={settings.schoolName || context.workspace.name} role={context.role} contentClassName="timetableSurface">
      <section className="timetableHero">
        <div><p>ORARIO · {context.academicYear.label}</p><h1>Il tuo orario</h1><span>Prima la lezione pertinente, poi la mappa della settimana. Configurazione e copertura restano disponibili solo quando servono.</span></div>
      </section>

      {focusSlot ? (
        <section className="humanTaskFocus" aria-labelledby="timetable-focus-title">
          <p className="humanTaskFocusEyebrow">{currentSlot ? 'ADESSO' : 'PROSSIMA LEZIONE'}</p>
          <h2 id="timetable-focus-title">{focusSlot.title}</h2>
          <p>{focusSlot.description}</p>
          <div className="humanTaskMeta"><span>{focusSlot.time}</span><span>{focusSlot.kind}</span>{focusSlot.room ? <span>Aula {focusSlot.room}</span> : null}</div>
          <div className="humanTaskActions">{focusSlot.sectionId ? <Link className="primary" href={`/classi/${encodeURIComponent(focusSlot.sectionId)}`}>Apri la classe</Link> : <Link className="primary" href="#settimana-tipo">Vedi in griglia</Link>}{focusSlot.sectionId ? <Link href={`/piano-annuale?section=${encodeURIComponent(focusSlot.sectionId)}`}>Piano annuale</Link> : null}</div>
        </section>
      ) : (
        <section className="humanTaskFocus"><p className="humanTaskFocusEyebrow">ADESSO</p><h2>Nessuna lezione prevista in questa fascia</h2><p>Usa la griglia per orientarti nella settimana. Le verifiche di copertura non competono con la lettura operativa dell’orario.</p><div className="humanTaskActions"><Link className="primary" href="#settimana-tipo">Apri la settimana</Link></div></section>
      )}

      <section className="timetableCard timetableGridCard" id="settimana-tipo" aria-labelledby="grid-title">
        <div className="timetableCardHeading"><span>01</span><div><h2 id="grid-title">Settimana tipo</h2><p>Classe e tipo di attività hanno la precedenza. Tocca una lezione per entrare nel contesto operativo.</p></div><b className="draftBadge">{draftLabel}</b></div>
        <TimetableGrid versionId={timetable.draftVersion.id} days={days} periods={periodPresets} slots={timetable.slots} assignments={gridAssignments} />
      </section>

      <details className="humanTaskSecondary">
        <summary>Controlla configurazione e copertura</summary>
        <div className="humanTaskSecondaryBody">
          <section className="timetableMetrics" aria-label="Riepilogo di configurazione dell’orario">
            <article><span>Cattedra</span><strong>{confirmedAssignments}/{timetable.assignments.length}</strong><small>associazioni confermate</small></article>
            <article><span>Monte ore</span><strong>{formatHours(totalAssignedMinutes)}</strong><small>settimanali previste</small></article>
            <article><span>In griglia</span><strong>{formatHours(totalScheduledMinutes)}</strong><small>lezioni della cattedra</small></article>
            <article><span>Copertura</span><strong>{coverageDelta === 0 ? 'Allineata' : formatHours(Math.abs(coverageDelta))}</strong><small>{coverageDelta > 0 ? 'ancora da collocare' : coverageDelta < 0 ? 'oltre il monte ore' : 'monte ore coperto'}</small></article>
          </section>

          <section className="timetableCard timetableCoverageCard" aria-labelledby="coverage-title">
            <div className="timetableCoverageHeader"><div className="timetableCardHeading"><span>02</span><div><h2 id="coverage-title">Copertura della cattedra</h2><p>Questa è una verifica di configurazione, non il compito principale durante la giornata.</p></div></div><Link href="/impostazioni#cattedra">Gestisci cattedra</Link></div>
            {gridAssignments.length ? <div className="timetableCoverageList">{gridAssignments.map((assignment) => { const delta = assignment.weeklyMinutes - assignment.scheduledMinutes; return <article className="timetableCoverageItem" key={assignment.id}><div className="timetableCoverageIdentity"><strong>{assignment.label}<span className={`timetableCoverageStatus ${assignment.status === 'CONFIRMED' ? 'confirmed' : ''}`}>{assignment.status === 'CONFIRMED' ? 'Confermata' : 'Da confermare'}</span></strong><span>{formatHours(assignment.weeklyMinutes)} previste</span></div><div className="timetableCoverageValue"><strong>{formatHours(assignment.scheduledMinutes)} in griglia</strong><span className={delta === 0 ? 'ok' : delta < 0 ? 'over' : ''}>{delta === 0 ? 'Allineata' : delta > 0 ? `Mancano ${formatHours(delta)}` : `Eccesso ${formatHours(Math.abs(delta))}`}</span></div></article> })}</div> : <div className="timetableEmpty"><strong>La cattedra non è ancora configurata</strong><span>Per inserire le tue lezioni serve almeno una associazione di cattedra.</span><Link href="/impostazioni#cattedra">Configura la cattedra</Link></div>}
          </section>
        </div>
      </details>

      <details className="timetableVersionDetails">
        <summary><div><strong>Versione dell’orario · {timetable.draftVersion.label}</strong><span>{draftLabel} · prevista dal {formatDate(timetable.draftVersion.effectiveFrom)}</span></div></summary>
        <div className="timetableVersionDetailsBody"><form action={updateTimetableDraft} className="timetableForm versionForm"><input type="hidden" name="versionId" value={timetable.draftVersion.id} /><label><span>Nome della bozza</span><input name="label" defaultValue={timetable.draftVersion.label} maxLength={160} required /></label><label><span>Prevista dal</span><input name="effectiveFrom" type="date" defaultValue={timetable.draftVersion.effectiveFrom} min={context.academicYear.startsOn} max={context.academicYear.endsOn} required /></label><label><span>Da dove deriva</span><select name="sourceKind" defaultValue={timetable.draftVersion.sourceKind}><option value="MANUAL">Inserimento manuale</option><option value="INSTITUTION_DOCUMENT">Documento istituzionale</option><option value="IMPORT">Importazione</option></select></label><label className="wideField"><span>Riferimento della fonte</span><input name="sourceRef" defaultValue={timetable.draftVersion.sourceRef ?? ''} maxLength={1000} placeholder="Opzionale: circolare, file, nota…" /></label><button className="timetablePrimaryButton" type="submit">Salva versione</button></form></div>
      </details>
    </AppShell>
  )
}

function buildPeriods(startTime: string, durationMinutes: number, count: number) { const first = timeToMinutes(startTime); return Array.from({ length: count }, (_, index) => ({ ordinal: index + 1, start: minutesToTime(first + index * durationMinutes), end: minutesToTime(first + (index + 1) * durationMinutes) })) }
function sectionLabel(grade: keyof typeof GRADE_LABELS, sectionCode: string) { return `${GRADE_LABELS[grade]} ${sectionCode}` }
function versionStatusLabel(value: string) { if (value === 'DRAFT') return 'Bozza'; if (value === 'ACTIVE') return 'Attivo'; if (value === 'ARCHIVED') return 'Archiviato'; return value }
function formatHours(minutes: number) { if (!minutes) return '0h'; const hours = Math.floor(minutes / 60); const rest = minutes % 60; if (!hours) return `${rest}m`; return rest ? `${hours}h ${rest}m` : `${hours}h` }
function formatDate(value: string) { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}` }
function currentRomeMoment() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[value.weekday] ?? 7; return { weekday, minutes: Number(value.hour) * 60 + Number(value.minute) } }
function describeSlot(slot: { sectionId: string | null; disciplineId: string | null; manualClassLabel: string | null; slotKind: string; startTime: string; endTime: string; room: string | null }, sectionById: Map<string, { grade: keyof typeof GRADE_LABELS; sectionCode: string }>, disciplineById: Map<string, { name: string }>) { const section = slot.sectionId ? sectionById.get(slot.sectionId) : null; const discipline = slot.disciplineId ? disciplineById.get(slot.disciplineId) : null; const title = section ? sectionLabel(section.grade, section.sectionCode) : slot.manualClassLabel || presenceLabel(slot.slotKind); return { title, sectionId: section ? slot.sectionId : null, time: `${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`, kind: discipline?.name || presenceLabel(slot.slotKind), room: slot.room, description: section ? `Questa è la lezione pertinente nel tuo schema settimanale. Entra nella classe per vedere il prossimo tratto didattico e i materiali utili.` : `Questa presenza non crea una classe canonica. Resta nel contesto dell’Orario senza inventare collegamenti didattici.` } }
function presenceLabel(kind: string) { if (kind === 'DISPOSITION') return 'Disposizione'; if (kind === 'RECEPTION') return 'Ricevimento'; if (kind === 'CLASS_PRESENCE') return 'Presenza in classe'; return 'Impegno' }
