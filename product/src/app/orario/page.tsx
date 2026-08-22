import Link from 'next/link'
import { redirect } from 'next/navigation'
import { minutesToTime, slotDurationMinutes, timeToMinutes, TIMETABLE_WEEKDAYS } from '@/core/domain/timetable'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTimetableRepository } from '@/core/infrastructure/supabase/supabase-timetable-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  addLessonSlot,
  addSpecialSlot,
  addTeachingAssignment,
  deleteTimetableSlot,
  updateTeachingAssignment,
  updateTimetableDraft,
} from './actions'
import './timetable.css'

export const dynamic = 'force-dynamic'

const GRADE_LABELS = { PRIMA: '1ª', SECONDA: '2ª', TERZA: '3ª' } as const
const SPECIAL_LABELS = { DISPOSITION: 'Disposizione', RECEPTION: 'Ricevimento', OTHER: 'Altro' } as const

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
  const assignmentById = new Map(timetable.assignments.map((assignment) => [assignment.id, assignment]))
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
  const defaultPeriod = periodPresets[0] ?? { ordinal: 1, start: settings.schoolDayStart, end: minutesToTime(timeToMinutes(settings.schoolDayStart) + settings.defaultPeriodMinutes) }
  const weekdayOptions = TIMETABLE_WEEKDAYS.filter((day) => settings.teachingWeekdays.includes(day.value))
  const totalAssignedMinutes = timetable.assignments.reduce((sum, assignment) => sum + assignment.weeklyMinutes, 0)
  const totalScheduledMinutes = timetable.slots.filter((slot) => slot.slotKind === 'LESSON').reduce((sum, slot) => sum + slotDurationMinutes(slot.startTime, slot.endTime), 0)

  return (
    <div className="appShell">
      <aside className="navRail" aria-label="Navigazione principale">
        <div className="brandLockup"><span className="brandMark">D</span><div><strong>DOCENTE OS</strong><span>{context.academicYear.label}</span></div></div>
        <nav className="navList">
          <Link className="navItem" href="/"><span aria-hidden>⌂</span> Home</Link>
          <Link className="navItem" href="/planner"><span aria-hidden>◎</span> Oggi</Link>
          <Link className="navItem active" href="/orario"><span aria-hidden>◷</span> Orario</Link>
          <Link className="navItem" href="/piano-annuale"><span aria-hidden>▤</span> Piano annuale</Link>
          <Link className="navItem" href="/progetta"><span aria-hidden>✦</span> Progetta</Link>
          <Link className="navItem" href="/knowledge"><span aria-hidden>◇</span> Conoscenza</Link>
          <Link className="navItem" href="/classi"><span aria-hidden>▦</span> Classi</Link>
          <Link className="navItem" href="/impostazioni"><span aria-hidden>⚙</span> Impostazioni</Link>
        </nav>
        <div className="navFooter"><span className="workspaceDot" aria-hidden /><div><strong>{settings.schoolName || context.workspace.name}</strong><span>{settings.teacherDisplayName || context.role}</span></div></div>
      </aside>

      <main className="workSurface timetableSurface">
        <header className="mobileHeader"><div><span className="mobileEyebrow">DOCENTE OS</span><strong>Orario</strong></div><Link className="iconButton" href="/impostazioni" aria-label="Apri Impostazioni">⚙</Link></header>

        <section className="timetableHero">
          <div><p>ORARIO · {context.academicYear.label}</p><h1>Costruisci la tua settimana</h1><span>La bozza usa classi, discipline e preset delle Impostazioni. Il piano annuale resta separato.</span></div>
          <Link className="secondaryButton" href="/impostazioni">Modifica impostazioni</Link>
        </section>

        <section className="timetableMetrics" aria-label="Riepilogo configurazione">
          <article><span>Cattedra</span><strong>{timetable.assignments.length}</strong><small>abbinamenti</small></article>
          <article><span>Monte ore</span><strong>{formatHours(totalAssignedMinutes)}</strong><small>settimanali dichiarate</small></article>
          <article><span>In griglia</span><strong>{formatHours(totalScheduledMinutes)}</strong><small>lezioni pianificate</small></article>
          <article><span>Bozza</span><strong>{timetable.slots.length}</strong><small>slot ricorrenti</small></article>
        </section>

        <section className="timetableCard" aria-labelledby="draft-title">
          <div className="timetableCardHeading"><span>01</span><div><h2 id="draft-title">Versione orario</h2><p>La prima configurazione resta in bozza: non produce ancora date CAN-PLAN né modifica lo storico.</p></div><b className="draftBadge">{timetable.draftVersion.status}</b></div>
          <form action={updateTimetableDraft} className="timetableForm versionForm">
            <input type="hidden" name="versionId" value={timetable.draftVersion.id} />
            <label><span>Nome versione</span><input name="label" defaultValue={timetable.draftVersion.label} maxLength={160} required /></label>
            <label><span>Valida dal</span><input name="effectiveFrom" type="date" defaultValue={timetable.draftVersion.effectiveFrom} min={context.academicYear.startsOn} max={context.academicYear.endsOn} required /></label>
            <label><span>Origine</span><select name="sourceKind" defaultValue={timetable.draftVersion.sourceKind}><option value="MANUAL">Inserimento manuale</option><option value="INSTITUTION_DOCUMENT">Documento istituzionale</option><option value="IMPORT">Importazione</option></select></label>
            <label className="wideField"><span>Riferimento fonte</span><input name="sourceRef" defaultValue={timetable.draftVersion.sourceRef ?? ''} maxLength={1000} placeholder="Opzionale: circolare, file, nota…" /></label>
            <button className="timetablePrimaryButton" type="submit">Salva bozza</button>
          </form>
        </section>

        <section className="timetableCard" aria-labelledby="assignments-title">
          <div className="timetableCardHeading"><span>02</span><div><h2 id="assignments-title">Cattedra</h2><p>Associa esplicitamente una classe/sezione a una disciplina e definisci il monte minuti settimanale.</p></div><b>{availablePairCount > 0 ? `${availablePairCount} combinazioni disponibili` : 'Completa'}</b></div>
          {annualSnapshot.sections.length && activeDisciplines.length ? (
            <form action={addTeachingAssignment} className="timetableForm assignmentForm">
              <label><span>Classe / sezione</span><select name="sectionId" required>{annualSnapshot.sections.map((section) => <option key={section.id} value={section.id}>{sectionLabel(section.grade, section.sectionCode)} · {statusLabel(section.status)}</option>)}</select></label>
              <label><span>Disciplina</span><select name="disciplineId" required>{activeDisciplines.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.name}</option>)}</select></label>
              <label><span>Minuti / settimana</span><input name="weeklyMinutes" type="number" min="30" max="2400" step="5" defaultValue="120" required /></label>
              <label className="wideField"><span>Fonte / nota</span><input name="sourceNote" maxLength={1000} placeholder="Es. assegnazione provvisoria; orario da confermare" /></label>
              <button className="timetablePrimaryButton" type="submit">Aggiungi alla cattedra</button>
            </form>
          ) : <div className="timetableEmpty"><strong>Completa prima le Impostazioni</strong><span>Servono almeno una classe/sezione e una disciplina attiva.</span><Link href="/impostazioni">Apri Impostazioni</Link></div>}

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

        <section className="timetableCard" aria-labelledby="slots-title">
          <div className="timetableCardHeading"><span>03</span><div><h2 id="slots-title">Slot ricorrenti</h2><p>Inserisci le lezioni nella bozza settimanale. Gli orari proposti derivano dai preset delle Impostazioni.</p></div></div>
          {timetable.assignments.length ? <form action={addLessonSlot} className="timetableForm slotForm">
            <input type="hidden" name="versionId" value={timetable.draftVersion.id} />
            <label><span>Cattedra</span><select name="assignmentId" required>{timetable.assignments.map((assignment) => { const section = sectionById.get(assignment.sectionId); const discipline = disciplineById.get(assignment.disciplineId); return <option key={assignment.id} value={assignment.id}>{section ? sectionLabel(section.grade, section.sectionCode) : 'Sezione'} · {discipline?.name ?? 'Disciplina'}</option> })}</select></label>
            <label><span>Giorno</span><select name="weekday" required>{weekdayOptions.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
            <label><span>Inizio</span><select name="startTime" defaultValue={defaultPeriod.start}>{periodPresets.map((period) => <option key={`s-${period.ordinal}`} value={period.start}>{period.ordinal}ª · {period.start}</option>)}</select></label>
            <label><span>Fine</span><select name="endTime" defaultValue={defaultPeriod.end}>{periodPresets.map((period) => <option key={`e-${period.ordinal}`} value={period.end}>{period.ordinal}ª · {period.end}</option>)}</select></label>
            <label><span>Ora n.</span><input name="ordinal" type="number" min="1" max="20" defaultValue={defaultPeriod.ordinal} /></label>
            <label><span>Aula</span><input name="room" maxLength={80} placeholder="Opzionale" /></label>
            <label className="wideField"><span>Nota</span><input name="note" maxLength={1000} placeholder="Opzionale" /></label>
            <button className="timetablePrimaryButton" type="submit">Aggiungi lezione</button>
          </form> : <p className="timetableHint">Definisci prima almeno una voce di cattedra.</p>}

          <details className="specialSlotPanel"><summary>Aggiungi disposizione, ricevimento o altro impegno</summary><form action={addSpecialSlot} className="timetableForm slotForm">
            <input type="hidden" name="versionId" value={timetable.draftVersion.id} />
            <label><span>Tipo</span><select name="kind"><option value="DISPOSITION">Disposizione</option><option value="RECEPTION">Ricevimento</option><option value="OTHER">Altro</option></select></label>
            <label><span>Giorno</span><select name="weekday">{weekdayOptions.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
            <label><span>Inizio</span><input name="startTime" type="time" defaultValue={defaultPeriod.start} required /></label>
            <label><span>Fine</span><input name="endTime" type="time" defaultValue={defaultPeriod.end} required /></label>
            <label><span>Ora n.</span><input name="ordinal" type="number" min="1" max="20" /></label>
            <label className="wideField"><span>Nota</span><input name="note" maxLength={1000} placeholder="Es. ricevimento settimanale" /></label>
            <button className="secondaryButton" type="submit">Aggiungi impegno</button>
          </form></details>
        </section>

        <section className="timetableCard" aria-labelledby="week-title">
          <div className="timetableCardHeading"><span>04</span><div><h2 id="week-title">Settimana configurata</h2><p>T1 mostra l’elenco ordinato. La griglia visuale Settimana/Giorno arriverà nella slice T2 sugli stessi record.</p></div></div>
          {timetable.slots.length ? <div className="slotList">{timetable.slots.map((slot) => {
            const assignment = slot.teachingAssignmentId ? assignmentById.get(slot.teachingAssignmentId) : null
            const section = assignment ? sectionById.get(assignment.sectionId) : null
            const discipline = assignment ? disciplineById.get(assignment.disciplineId) : null
            return <article className={`slotRow ${slot.slotKind !== 'LESSON' ? 'specialSlot' : ''}`} key={slot.id}>
              <div className="slotTime"><strong>{weekdayLabel(slot.weekday)}</strong><span>{slot.startTime}–{slot.endTime}</span></div>
              <div className="slotIdentity">{slot.slotKind === 'LESSON' ? <><strong>{section ? sectionLabel(section.grade, section.sectionCode) : 'Classe'} · {discipline?.name ?? 'Disciplina'}</strong><span>{slot.ordinal ? `${slot.ordinal}ª ora` : `${slotDurationMinutes(slot.startTime, slot.endTime)} min`}{slot.room ? ` · Aula ${slot.room}` : ''}</span></> : <><strong>{SPECIAL_LABELS[slot.slotKind as keyof typeof SPECIAL_LABELS] ?? 'Altro'}</strong><span>{slot.note ?? 'Impegno non didattico'}</span></>}</div>
              {slot.note && slot.slotKind === 'LESSON' ? <small>{slot.note}</small> : null}
              <form action={deleteTimetableSlot}><input type="hidden" name="versionId" value={timetable.draftVersion.id} /><input type="hidden" name="slotId" value={slot.id} /><button className="textDangerButton" type="submit">Rimuovi</button></form>
            </article>
          })}</div> : <div className="timetableEmpty"><strong>La bozza è ancora vuota</strong><span>Aggiungi il primo slot usando i preset delle Impostazioni.</span></div>}
        </section>

        <aside className="timetableContract"><strong>Regola T1</strong><span>La bozza non consuma B01–B33. L’allocazione del CAN-PLAN avverrà solo dopo calendario, eccezioni e attivazione della versione orario.</span></aside>
      </main>

      <nav className="bottomNav" aria-label="Navigazione mobile"><Link href="/"><span aria-hidden>⌂</span><small>Home</small></Link><Link href="/planner"><span aria-hidden>◎</span><small>Oggi</small></Link><Link className="active" href="/orario"><span aria-hidden>◷</span><small>Orario</small></Link><Link href="/progetta"><span aria-hidden>✦</span><small>Progetta</small></Link><Link href="/classi"><span aria-hidden>▦</span><small>Classi</small></Link><Link href="/impostazioni"><span aria-hidden>⚙</span><small>Impost.</small></Link></nav>
    </div>
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

function weekdayLabel(value: number) {
  return TIMETABLE_WEEKDAYS.find((day) => day.value === value)?.label ?? `Giorno ${value}`
}

function formatHours(minutes: number) {
  if (!minutes) return '0h'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}
