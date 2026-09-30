import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { canActivateTimetableDraft, minutesToTime, slotDurationMinutes, timeToMinutes, TIMETABLE_WEEKDAYS } from '@/core/domain/timetable'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTimetableImportRepository } from '@/core/infrastructure/supabase/supabase-timetable-import-repository'
import { SupabaseTimetableLifecycleRepository } from '@/core/infrastructure/supabase/supabase-timetable-lifecycle-repository'
import { SupabaseTimetableRepository } from '@/core/infrastructure/supabase/supabase-timetable-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  activateTimetableDraft,
  addTimetableImportRow,
  analyzeTimetableImport,
  applyTimetableImportCandidate,
  updateTimetableDraft,
  updateTimetableImportRow,
} from './actions'
import TimetableGrid from './TimetableGrid'
import './timetable.css'
import './orario-guidance.css'

export const dynamic = 'force-dynamic'

const GRADE_LABELS = { PRIMA: '1ª', SECONDA: '2ª', TERZA: '3ª' } as const

export default async function TimetablePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/')

  const importCandidateId = singleParam(params.importCandidate)
  const importStatus = singleParam(params.import)

  const settingsRepository = new SupabaseTeacherSettingsRepository()
  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const timetableRepository = new SupabaseTimetableRepository()
  const lifecycleRepository = new SupabaseTimetableLifecycleRepository()
  const importRepository = new SupabaseTimetableImportRepository()
  const [settings, disciplines, annualSnapshot, timetable, lifecycle] = await Promise.all([
    settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
    settingsRepository.listDisciplines(context.workspace.id, context.academicYear.id),
    annualRepository.list(context.workspace.id, context.academicYear.id),
    timetableRepository.list(context.workspace.id, context.academicYear.id, context.academicYear.startsOn),
    lifecycleRepository.read(context.workspace.id, context.academicYear.id),
  ])

  const importCandidate = importCandidateId
    ? await importRepository.getReview({
        candidateId: importCandidateId,
        workspaceId: context.workspace.id,
        academicYearId: context.academicYear.id,
      })
    : null
  const importDraftToken = importCandidate?.state === 'READY_TO_CONFIRM'
    ? await importRepository.readDraftRevisionToken(timetable.draftVersion.id)
    : null
  const confirmationRequestId = importCandidate?.state === 'READY_TO_CONFIRM'
    ? crypto.randomUUID()
    : null

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
  const operationalSlots = lifecycle.activeVersion ? lifecycle.activeSlots : timetable.slots
  const moment = currentRomeMoment()
  const todaySlots = operationalSlots.filter((slot) => slot.weekday === moment.weekday).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  const currentSlot = todaySlots.find((slot) => timeToMinutes(slot.startTime) <= moment.minutes && timeToMinutes(slot.endTime) > moment.minutes) ?? null
  const nextSlot = currentSlot ?? todaySlots.find((slot) => timeToMinutes(slot.startTime) > moment.minutes) ?? null
  const focusSlot = nextSlot ? describeSlot(nextSlot, sectionById, disciplineById) : null
  const archivedVersions = lifecycle.versions.filter((version) => version.status === 'ARCHIVED').slice(0, 3)
  const canActivateDraft = canActivateTimetableDraft(lifecycle.activeVersion, timetable.draftVersion)

  return (
    <AppShell active="timetable" academicYearLabel={context.academicYear.label} workspaceName={settings.schoolName || context.workspace.name} role={context.role} contentClassName="timetableSurface">
      <section className="timetableHero">
        <div><p>ORARIO · {context.academicYear.label}</p><h1>Il tuo orario</h1><span>Prima ciò che vale oggi, poi la bozza che stai preparando. Le modifiche future non cambiano l’orario in uso finché non decidi di attivarle.</span></div>
      </section>

      {focusSlot ? (
        <section className="humanTaskFocus" aria-labelledby="timetable-focus-title">
          <p className="humanTaskFocusEyebrow">{currentSlot ? 'ADESSO' : 'PROSSIMA LEZIONE'}</p>
          <h2 id="timetable-focus-title">{focusSlot.title}</h2>
          <p>{focusSlot.description}</p>
          <div className="humanTaskMeta"><span>{focusSlot.time}</span><span>{focusSlot.kind}</span>{focusSlot.room ? <span>Aula {focusSlot.room}</span> : null}<span>{lifecycle.activeVersion ? 'Orario in uso' : 'Bozza iniziale'}</span></div>
          <div className="humanTaskActions">{focusSlot.sectionId ? <Link className="primary" href={`/classi/${encodeURIComponent(focusSlot.sectionId)}`}>Apri la classe</Link> : <Link className="primary" href="#settimana-tipo">Vedi in griglia</Link>}{focusSlot.sectionId ? <Link href={`/piano-annuale?section=${encodeURIComponent(focusSlot.sectionId)}`}>Piano annuale</Link> : null}</div>
        </section>
      ) : (
        <section className="humanTaskFocus"><p className="humanTaskFocusEyebrow">ADESSO</p><h2>Nessuna lezione prevista in questa fascia</h2><p>{lifecycle.activeVersion ? 'L’orario in uso non prevede una lezione adesso.' : 'Non hai ancora messo in uso una versione dell’orario: per orientarti uso temporaneamente la bozza iniziale.'}</p><div className="humanTaskActions"><Link className="primary" href="#settimana-tipo">Apri la settimana</Link></div></section>
      )}

      <section className="timetableCard timetableImportCard" id="importa-orario" aria-labelledby="import-title">
        <div className="timetableCardHeading">
          <span>01</span>
          <div>
            <h2 id="import-title">Importa un nuovo orario</h2>
            <p>Carica il PDF o una foto dell’orario. Docente OS prepara la proposta; tu controlli e poi decidi se applicarla alla bozza.</p>
          </div>
        </div>

        {importStatus ? <ImportStatus code={importStatus} /> : null}

        {!importCandidate || importCandidate.state === 'APPLIED_TO_DRAFT' ? (
          <form action={analyzeTimetableImport} className="timetableImportForm">
            <label>
              <span>PDF o immagine</span>
              <input name="file" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" required />
            </label>
            <label>
              <span>Cognome o etichetta docente nel documento</span>
              <input name="teacherLabel" autoComplete="off" maxLength={120} required placeholder="Es. ROSSI" />
              <small>Serve solo per trovare il tuo orario nel documento. Non viene salvato.</small>
            </label>
            <label>
              <span>Valido dal</span>
              <input
                name="effectiveFrom"
                type="date"
                defaultValue={clampDate(currentRomeDate(), context.academicYear.startsOn, context.academicYear.endsOn)}
                min={context.academicYear.startsOn}
                max={context.academicYear.endsOn}
                required
              />
            </label>
            <button className="timetablePrimaryButton" type="submit">Analizza il documento</button>
          </form>
        ) : (
          <div className="timetableImportReview">
            <div className="timetableImportSummary">
              <div>
                <strong>{importCandidate.sourceLabel}</strong>
                <span>Valido dal {importCandidate.effectiveFrom ? formatDate(importCandidate.effectiveFrom) : '—'} · {importCandidate.rows.length} righe</span>
              </div>
              <b className={importCandidate.state === 'READY_TO_CONFIRM' ? 'draftBadge ready' : 'draftBadge'}>
                {importCandidate.state === 'READY_TO_CONFIRM' ? 'Pronto da confermare' : 'Da controllare'}
              </b>
            </div>

            <div className="timetableImportRows">
              {importCandidate.rows.map((row) => (
                <form action={updateTimetableImportRow} className="timetableImportRow" key={row.id}>
                  <input type="hidden" name="candidateId" value={importCandidate.id} />
                  <input type="hidden" name="candidateRevision" value={importCandidate.revision} />
                  <input type="hidden" name="rowId" value={row.id} />
                  <div className="timetableImportRowIdentity">
                    <strong>{row.sourceClassLabel ?? 'Classe da verificare'}</strong>
                    <span>{weekdayLabel(row.weekday)} · {row.ordinal ? row.ordinal + 'ª ora' : 'ora da verificare'}</span>
                    <small>{row.reviewState === 'REVIEW_REQUIRED' ? 'Controllo necessario' : 'Risolta'}</small>
                  </div>
                  <label>
                    <span>Cattedra</span>
                    <select name="assignmentId" defaultValue={row.resolvedAssignmentId ?? ''} required>
                      <option value="" disabled>Seleziona…</option>
                      {gridAssignments.map((assignment) => (
                        <option key={assignment.id} value={assignment.id}>{assignment.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Giorno</span>
                    <select name="weekday" defaultValue={row.weekday ?? 1} required>
                      {days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Ora</span>
                    <input name="ordinal" type="number" min={1} max={20} defaultValue={row.ordinal ?? ''} required />
                  </label>
                  <label>
                    <span>Inizio</span>
                    <input name="startTime" type="time" defaultValue={row.startTime ?? ''} required />
                  </label>
                  <label>
                    <span>Fine</span>
                    <input name="endTime" type="time" defaultValue={row.endTime ?? ''} required />
                  </label>
                  <button type="submit">Salva riga</button>
                </form>
              ))}
            </div>

            <details className="timetableImportAdd">
              <summary>Aggiungi una lezione mancante</summary>
              <form action={addTimetableImportRow} className="timetableImportAddForm">
                <input type="hidden" name="candidateId" value={importCandidate.id} />
                <input type="hidden" name="candidateRevision" value={importCandidate.revision} />
                <label>
                  <span>Cattedra</span>
                  <select name="assignmentId" required defaultValue="">
                    <option value="" disabled>Seleziona…</option>
                    {gridAssignments.map((assignment) => (
                      <option key={assignment.id} value={assignment.id}>{assignment.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Giorno</span>
                  <select name="weekday" defaultValue={1} required>
                    {days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Ora</span>
                  <input name="ordinal" type="number" min={1} max={20} required />
                </label>
                <label>
                  <span>Inizio</span>
                  <input name="startTime" type="time" required />
                </label>
                <label>
                  <span>Fine</span>
                  <input name="endTime" type="time" required />
                </label>
                <button type="submit">Aggiungi</button>
              </form>
            </details>

            {importCandidate.state === 'READY_TO_CONFIRM' && importDraftToken && confirmationRequestId ? (
              <form action={applyTimetableImportCandidate} className="timetableImportConfirm">
                <input type="hidden" name="candidateId" value={importCandidate.id} />
                <input type="hidden" name="candidateRevision" value={importCandidate.revision} />
                <input type="hidden" name="draftVersionId" value={timetable.draftVersion.id} />
                <input type="hidden" name="expectedDraftToken" value={importDraftToken} />
                <input type="hidden" name="confirmationRequestId" value={confirmationRequestId} />
                <div>
                  <strong>La proposta è completa.</strong>
                  <span>La conferma sostituisce soltanto le lezioni della bozza. Disposizioni, ricevimento e altre personalizzazioni restano invariati.</span>
                  <label className="timetableImportCompleteCheck">
                    <input type="checkbox" name="teacherCompleteConfirmed" value="yes" required />
                    <span>Confermo che questa proposta contiene tutte le mie lezioni del nuovo orario.</span>
                  </label>
                </div>
                <button className="timetablePrimaryButton" type="submit">Applica alla bozza</button>
              </form>
            ) : (
              <p className="timetableImportHint">Completa le righe da controllare. Quando tutte sono valide comparirà il pulsante di conferma.</p>
            )}
          </div>
        )}
      </section>

      <section className="timetableCard timetableGridCard" id="settimana-tipo" aria-labelledby="grid-title">
        <div className="timetableCardHeading"><span>02</span><div><h2 id="grid-title">{lifecycle.activeVersion ? 'Prossima versione' : 'Settimana tipo'}</h2><p>{lifecycle.activeVersion ? 'Questa griglia è una copia modificabile dell’orario in uso. Le modifiche restano in bozza finché non scegli di metterle in uso.' : 'Costruisci la prima settimana tipo. Quando è pronta potrai metterla in uso senza perdere una copia modificabile.'}</p></div><b className="draftBadge">{draftLabel}</b></div>
        <TimetableGrid versionId={timetable.draftVersion.id} days={days} periods={periodPresets} slots={timetable.slots} assignments={gridAssignments} />
      </section>

      <details className="timetableVersionDetails" open={!lifecycle.activeVersion}>
        <summary><div><strong>{lifecycle.activeVersion ? `In uso · ${lifecycle.activeVersion.label}` : 'Nessun orario ancora messo in uso'}</strong><span>{lifecycle.activeVersion ? `Dal ${formatDate(lifecycle.activeVersion.effectiveFrom)} · le modifiche restano separate` : 'La bozza iniziale guida temporaneamente la vista operativa finché non la attivi'}</span></div></summary>
        <div className="timetableVersionDetailsBody">
          {lifecycle.activeVersion ? <p><strong>Orario in uso.</strong> Oggi e la home leggono questa versione, non la bozza che stai modificando. Quando attiverai la bozza, questo orario verrà chiuso il giorno precedente alla nuova decorrenza e resterà nello storico.</p> : <p><strong>Primo passaggio.</strong> Mettere in uso la bozza stabilisce quale orario deve guidare Oggi. Il sistema conserva automaticamente una copia identica come nuova bozza, così potrai preparare cambi futuri senza toccare ciò che è già operativo.</p>}
          {!canActivateDraft && lifecycle.activeVersion ? <p><strong>Prima scegli una decorrenza successiva.</strong> La bozza è ancora impostata dal {formatDate(timetable.draftVersion.effectiveFrom)}, mentre l’orario in uso parte dal {formatDate(lifecycle.activeVersion.effectiveFrom)}. Salva nella bozza una data successiva prima di sostituirlo.</p> : null}
          <form action={activateTimetableDraft}>
            <input type="hidden" name="versionId" value={timetable.draftVersion.id} />
            <button className="timetablePrimaryButton" type="submit" disabled={!canActivateDraft}>Metti in uso dal {formatDate(timetable.draftVersion.effectiveFrom)}</button>
          </form>
          {archivedVersions.length ? <details><summary>Vedi versioni precedenti</summary><div>{archivedVersions.map((version) => <p key={version.id}><strong>{version.label}</strong><br />{formatDate(version.effectiveFrom)}–{version.effectiveTo ? formatDate(version.effectiveTo) : 'fine non registrata'}</p>)}</div></details> : null}
        </div>
      </details>

      <details className="humanTaskSecondary">
        <summary>Controlla configurazione e copertura della bozza</summary>
        <div className="humanTaskSecondaryBody">
          <section className="timetableMetrics" aria-label="Riepilogo di configurazione della bozza orario">
            <article><span>Cattedra</span><strong>{confirmedAssignments}/{timetable.assignments.length}</strong><small>associazioni confermate</small></article>
            <article><span>Monte ore</span><strong>{formatHours(totalAssignedMinutes)}</strong><small>settimanali previste</small></article>
            <article><span>In bozza</span><strong>{formatHours(totalScheduledMinutes)}</strong><small>lezioni collocate</small></article>
            <article><span>Copertura</span><strong>{coverageDelta === 0 ? 'Allineata' : formatHours(Math.abs(coverageDelta))}</strong><small>{coverageDelta > 0 ? 'ancora da collocare' : coverageDelta < 0 ? 'oltre il monte ore' : 'monte ore coperto'}</small></article>
          </section>

          <section className="timetableCard timetableCoverageCard" aria-labelledby="coverage-title">
            <div className="timetableCoverageHeader"><div className="timetableCardHeading"><span>03</span><div><h2 id="coverage-title">Copertura della cattedra</h2><p>Questa verifica riguarda la bozza che stai preparando, non cambia l’orario già in uso.</p></div></div><Link href="/impostazioni#cattedra">Gestisci cattedra</Link></div>
            {gridAssignments.length ? <div className="timetableCoverageList">{gridAssignments.map((assignment) => { const delta = assignment.weeklyMinutes - assignment.scheduledMinutes; return <article className="timetableCoverageItem" key={assignment.id}><div className="timetableCoverageIdentity"><strong>{assignment.label}<span className={`timetableCoverageStatus ${assignment.status === 'CONFIRMED' ? 'confirmed' : ''}`}>{assignment.status === 'CONFIRMED' ? 'Confermata' : 'Da confermare'}</span></strong><span>{formatHours(assignment.weeklyMinutes)} previste</span></div><div className="timetableCoverageValue"><strong>{formatHours(assignment.scheduledMinutes)} in griglia</strong><span className={delta === 0 ? 'ok' : delta < 0 ? 'over' : ''}>{delta === 0 ? 'Allineata' : delta > 0 ? `Mancano ${formatHours(delta)}` : `Eccesso ${formatHours(Math.abs(delta))}`}</span></div></article> })}</div> : <div className="timetableEmpty"><strong>La cattedra non è ancora configurata</strong><span>Per inserire le tue lezioni serve almeno una associazione di cattedra.</span><Link href="/impostazioni#cattedra">Configura la cattedra</Link></div>}
          </section>
        </div>
      </details>

      <details className="timetableVersionDetails">
        <summary><div><strong>Dettagli della bozza · {timetable.draftVersion.label}</strong><span>{draftLabel} · prevista dal {formatDate(timetable.draftVersion.effectiveFrom)}</span></div></summary>
        <div className="timetableVersionDetailsBody"><form action={updateTimetableDraft} className="timetableForm versionForm"><input type="hidden" name="versionId" value={timetable.draftVersion.id} /><label><span>Nome della bozza</span><input name="label" defaultValue={timetable.draftVersion.label} maxLength={160} required /></label><label><span>Prevista dal</span><input name="effectiveFrom" type="date" defaultValue={timetable.draftVersion.effectiveFrom} min={context.academicYear.startsOn} max={context.academicYear.endsOn} required /></label><label><span>Da dove deriva</span><select name="sourceKind" defaultValue={timetable.draftVersion.sourceKind}><option value="MANUAL">Inserimento manuale</option><option value="INSTITUTION_DOCUMENT">Documento istituzionale</option><option value="IMPORT">Importazione</option></select></label><label className="wideField"><span>Riferimento della fonte</span><input name="sourceRef" defaultValue={timetable.draftVersion.sourceRef ?? ''} maxLength={1000} placeholder="Opzionale: circolare, file, nota…" /></label><button className="timetablePrimaryButton" type="submit">Salva bozza</button></form></div>
      </details>
    </AppShell>
  )
}

function buildPeriods(startTime: string, durationMinutes: number, count: number) { const first = timeToMinutes(startTime); return Array.from({ length: count }, (_, index) => ({ ordinal: index + 1, start: minutesToTime(first + index * durationMinutes), end: minutesToTime(first + (index + 1) * durationMinutes) })) }
function sectionLabel(grade: keyof typeof GRADE_LABELS, sectionCode: string) { return `${GRADE_LABELS[grade]} ${sectionCode}` }
function versionStatusLabel(value: string) { if (value === 'DRAFT') return 'Bozza'; if (value === 'ACTIVE') return 'In uso'; if (value === 'ARCHIVED') return 'Precedente'; return value }
function formatHours(minutes: number) { if (!minutes) return '0h'; const hours = Math.floor(minutes / 60); const rest = minutes % 60; if (!hours) return `${rest}m`; return rest ? `${hours}h ${rest}m` : `${hours}h` }
function formatDate(value: string) { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}` }
function currentRomeMoment() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[value.weekday] ?? 7; return { weekday, minutes: Number(value.hour) * 60 + Number(value.minute) } }
function describeSlot(slot: { sectionId: string | null; disciplineId: string | null; manualClassLabel: string | null; slotKind: string; startTime: string; endTime: string; room: string | null }, sectionById: Map<string, { grade: keyof typeof GRADE_LABELS; sectionCode: string }>, disciplineById: Map<string, { name: string }>) { const section = slot.sectionId ? sectionById.get(slot.sectionId) : null; const discipline = slot.disciplineId ? disciplineById.get(slot.disciplineId) : null; const title = section ? sectionLabel(section.grade, section.sectionCode) : slot.manualClassLabel || presenceLabel(slot.slotKind); return { title, sectionId: section ? slot.sectionId : null, time: `${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`, kind: discipline?.name || presenceLabel(slot.slotKind), room: slot.room, description: section ? `Questa è la lezione pertinente nell’orario che vale adesso. Entra nella classe per vedere il prossimo tratto didattico e i materiali utili.` : `Questa presenza appartiene all’orario che vale adesso e non crea una classe canonica.` } }
function presenceLabel(kind: string) { if (kind === 'DISPOSITION') return 'Disposizione'; if (kind === 'RECEPTION') return 'Ricevimento'; if (kind === 'CLASS_PRESENCE') return 'Presenza in classe'; return 'Impegno' }

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return [value.year, value.month, value.day].join('-')
}

function clampDate(value: string, min: string, max: string) {
  if (value < min) return min
  if (value > max) return max
  return value
}

function weekdayLabel(value: number | null) {
  const labels: Record<number, string> = {
    1: 'Lunedì',
    2: 'Martedì',
    3: 'Mercoledì',
    4: 'Giovedì',
    5: 'Venerdì',
    6: 'Sabato',
  }
  return value ? labels[value] ?? 'Giorno da verificare' : 'Giorno da verificare'
}

function ImportStatus({ code }: { code: string }) {
  const messages: Record<string, { tone: string; title: string; detail: string }> = {
    applied: { tone: 'success', title: 'Orario applicato alla bozza', detail: 'La bozza è stata aggiornata. L’orario in uso non è stato attivato né modificato.' },
    review: { tone: 'info', title: 'Proposta pronta', detail: 'Controlla le righe sotto e correggi solo ciò che serve.' },
    conflict: { tone: 'warning', title: 'La bozza è cambiata', detail: 'Nessuna modifica è stata applicata. Ricarica la proposta prima di confermare.' },
    review_stale: { tone: 'warning', title: 'La proposta è stata aggiornata', detail: 'Questa pagina mostra una revisione precedente. Riapri la proposta e controlla la versione aggiornata prima di confermare.' },
    already_applied: { tone: 'info', title: 'Documento già applicato', detail: 'Questo stesso documento risulta già applicato alla bozza.' },
    no_rows: { tone: 'warning', title: 'Nessuna lezione trovata', detail: 'Controlla l’etichetta docente e la leggibilità del documento.' },
    parse_failed: { tone: 'warning', title: 'Documento non analizzabile', detail: 'Nessuna modifica è stata effettuata. Prova con una scansione più leggibile o con il PDF originale.' },
    missing: { tone: 'warning', title: 'File mancante', detail: 'Seleziona un PDF o un’immagine.' },
    too_large: { tone: 'warning', title: 'File troppo grande', detail: 'Usa un file fino a 20 MB.' },
    unsupported: { tone: 'warning', title: 'Formato non supportato', detail: 'Sono accettati PDF, PNG, JPEG e WebP.' },
    invalid_content: { tone: 'warning', title: 'File non valido', detail: 'Il contenuto non corrisponde al formato dichiarato.' },
    invalid_date: { tone: 'warning', title: 'Data non valida', detail: 'La decorrenza deve ricadere nell’anno scolastico attivo.' },
    teacher_required: { tone: 'warning', title: 'Etichetta docente necessaria', detail: 'Indica il cognome o la stessa etichetta che compare nel documento.' },
    not_ready: { tone: 'warning', title: 'Proposta non completa', detail: 'Controlla le righe prima di confermare.' },
    apply_failed: { tone: 'warning', title: 'Applicazione non riuscita', detail: 'La transazione è stata annullata: la bozza non è stata modificata parzialmente.' },
    unavailable: { tone: 'warning', title: 'Proposta non disponibile', detail: 'Riapri l’importazione partendo dal documento.' },
  }
  const message = messages[code]
  if (!message) return null
  return <div className={'timetableImportStatus ' + message.tone} role="status"><strong>{message.title}</strong><span>{message.detail}</span></div>
}
