import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { TransientFeedback } from '@/components/ui/transient-feedback'
import { canActivateTimetableDraft, minutesToTime, slotDurationMinutes, timeToMinutes, TIMETABLE_WEEKDAYS } from '@/core/domain/timetable'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseCalendarRepository } from '@/core/infrastructure/supabase/supabase-calendar-repository'
import { SupabaseTeachingSessionRepository } from '@/core/infrastructure/supabase/supabase-teaching-session-repository'
import { SupabaseTimetableImportRepository } from '@/core/infrastructure/supabase/supabase-timetable-import-repository'
import { SupabaseTimetableExceptionRepository } from '@/core/infrastructure/supabase/supabase-timetable-exception-repository'
import { SupabaseTimetableLifecycleRepository } from '@/core/infrastructure/supabase/supabase-timetable-lifecycle-repository'
import { SupabaseTimetableRepository } from '@/core/infrastructure/supabase/supabase-timetable-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  activateTimetableDraft,
  addTimetableImportRow,
  applyTimetableImportCandidate,
  setTimetableOccurrenceActivityKind,
  updateTimetableDraft,
  updateTimetableImportRow,
} from './actions'
import TimetableGrid from './TimetableGrid'
import { TimetableLocalImportLauncher } from './TimetableLocalImportLauncher'
import { TimetableSubmitButton } from './TimetableSubmitButton'
import './timetable.css'
import './orario-guidance.css'

const GRADE_LABELS = { PRIMA: '1ª', SECONDA: '2ª', TERZA: '3ª' } as const

export async function TimetableExperience({
  searchParams,
  mode,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
  mode: 'view' | 'update' | 'manage'
}) {
  const params = await searchParams
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/')

  const importCandidateId = singleParam(params.importCandidate)
  const importStatus = singleParam(params.import)
  const actionFeedback = singleParam(params.feedback)
  const requestedPhase = singleParam(params.fase)
  const updatePhase = requestedPhase === 'data' || requestedPhase === 'controllo' ? requestedPhase : 'modifica'
  const showImportTool = mode === 'update' && Boolean(
    importCandidateId
    || importStatus
    || singleParam(params.strumento) === 'importa',
  )

  const moment = currentRomeMoment()
  const settingsRepository = new SupabaseTeacherSettingsRepository()
  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const timetableRepository = new SupabaseTimetableRepository()
  const lifecycleRepository = new SupabaseTimetableLifecycleRepository()
  const importRepository = new SupabaseTimetableImportRepository()
  const exceptionRepository = new SupabaseTimetableExceptionRepository()
  const calendarRepository = new SupabaseCalendarRepository()
  const teachingSessionRepository = new SupabaseTeachingSessionRepository()
  const [settings, disciplines, annualSnapshot, timetable, lifecycle, todayExceptions, calendarSnapshot, todaySessions] = await Promise.all([
    settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
    settingsRepository.listDisciplines(context.workspace.id, context.academicYear.id),
    annualRepository.list(context.workspace.id, context.academicYear.id),
    timetableRepository.list(context.workspace.id, context.academicYear.id, context.academicYear.startsOn),
    lifecycleRepository.read(context.workspace.id, context.academicYear.id),
    exceptionRepository.listByDate(context.workspace.id, context.academicYear.id, moment.localDate),
    calendarRepository.list(context.workspace.id, context.academicYear.id),
    teachingSessionRepository.listByDay(context.workspace.id, context.academicYear.id, moment.localDate),
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
  const todayCalendarDay = calendarSnapshot.days.find((day) => day.localDate === moment.localDate) ?? null
  const todayNoLessons = Boolean(todayCalendarDay && todayCalendarDay.dayKind !== 'SCHOOL_DAY')
  const todaySlots = (todayNoLessons ? [] : operationalSlots.filter((slot) => slot.weekday === moment.weekday)).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
  const currentSlot = todaySlots.find((slot) => timeToMinutes(slot.startTime) <= moment.minutes && timeToMinutes(slot.endTime) > moment.minutes) ?? null
  const nextSlot = currentSlot ?? todaySlots.find((slot) => timeToMinutes(slot.startTime) > moment.minutes) ?? null
  const focusSlot = nextSlot ? describeSlot(nextSlot, sectionById, disciplineById) : null
  const focusActivityException = nextSlot
    ? todayExceptions.find((exception) => exception.timetableSlotId === nextSlot.id && exception.kind === 'ACTIVITY_KIND_CHANGED') ?? null
    : null
  const focusActivityKind = nextSlot?.slotKind === 'LESSON'
    ? focusActivityException?.activityKind ?? nextSlot.activityKind ?? 'THEORY'
    : null
  const focusRecordedSession = nextSlot
    ? todaySessions.find((session) => session.source.timetableSlotId === nextSlot.id && session.localDate === moment.localDate) ?? null
    : null
  const archivedVersions = lifecycle.versions.filter((version) => version.status === 'ARCHIVED').slice(0, 3)
  const canActivateDraft = canActivateTimetableDraft(lifecycle.activeVersion, timetable.draftVersion)
  const minimumDraftDate = lifecycle.activeVersion
    ? nextIsoDate(lifecycle.activeVersion.effectiveFrom)
    : context.academicYear.startsOn

  return (
    <AppShell active="timetable" academicYearLabel={context.academicYear.label} workspaceName={settings.schoolName || context.workspace.name} role={context.role} contentClassName={`timetableSurface timetable-${mode}`}>
      <section className="timetableHero">
        <div>
          <p>{mode === 'update'
            ? showImportTool
              ? 'IMPORTA ORARIO'
              : `MODIFICA ORARIO · ${updatePhase === 'modifica' ? '1 DI 3' : updatePhase === 'data' ? '2 DI 3' : '3 DI 3'}`
            : `ORARIO · ${context.academicYear.label}`}</p>
          <h1>{mode === 'view'
            ? 'Il tuo orario'
            : showImportTool
              ? 'Importa orario'
              : updatePhase === 'modifica'
                ? 'Modifica orario'
                : updatePhase === 'data'
                  ? 'Da quando deve valere?'
                  : 'Controlla e attiva'}</h1>
          <span>{mode === 'view'
            ? (lifecycle.activeVersion ? `In uso dal ${formatDate(lifecycle.activeVersion.effectiveFrom)}.` : 'Non hai ancora un orario attivo.')
            : showImportTool
              ? 'Controlla la proposta ricavata dal documento. Nulla entra in uso senza la tua conferma.'
              : updatePhase === 'modifica'
                ? 'Cambia soltanto ciò che serve. L’orario in uso non cambia ancora.'
                : updatePhase === 'data'
                  ? 'Scegli la data dalla quale vuoi usare le modifiche.'
                  : 'Controlla il risultato. Solo il pulsante finale renderà operative le modifiche.'}</span>
        </div>
      </section>

      {mode === 'update' && !showImportTool ? (
        <div className="timetableFlowHeader">
          <ol className="timetableFlowSteps" aria-label="Avanzamento modifica orario">
            <li className={updatePhase === 'modifica' ? 'active' : 'done'}><span>1</span><strong>Modifica</strong></li>
            <li className={updatePhase === 'data' ? 'active' : updatePhase === 'controllo' ? 'done' : ''}><span>2</span><strong>Data</strong></li>
            <li className={updatePhase === 'controllo' ? 'active' : ''}><span>3</span><strong>Controlla</strong></li>
          </ol>
          <Link className="timetableFlowExit" href="/orario">Esci</Link>
        </div>
      ) : null}

      {actionFeedback ? <TimetableActionFeedback code={actionFeedback} /> : null}

      {mode === 'manage' ? (
        <section
          className={`timetableActivationAction ${canActivateDraft ? 'ready' : 'blocked'}`}
          aria-labelledby="timetable-activation-title"
          data-visual-priority="decision-primary"
          data-visual-moment="review"
        >
          <div className="timetableActivationCopy">
            <span className="timetableActivationEyebrow">{canActivateDraft ? 'BOZZA PRONTA' : 'DATA DA AGGIORNARE'}</span>
            <h2 id="timetable-activation-title">
              {canActivateDraft ? 'Metti in uso questo orario' : 'Scegli da quando deve valere'}
            </h2>
            <p>
              {canActivateDraft
                ? lifecycle.activeVersion
                  ? `La bozza è salvata. Dal ${formatDate(timetable.draftVersion.effectiveFrom)} sostituirà l’orario attuale; quello precedente resterà nello storico.`
                  : `La bozza è salvata. Dal ${formatDate(timetable.draftVersion.effectiveFrom)} diventerà l’orario usato da Oggi e dalla home.`
                : lifecycle.activeVersion
                  ? `L’orario in uso parte dal ${formatDate(lifecycle.activeVersion.effectiveFrom)}. La bozza deve avere una decorrenza successiva prima di poterlo sostituire.`
                  : 'Questa versione non è ancora pronta per essere messa in uso. Controlla la data di decorrenza della bozza.'}
            </p>
          </div>
          {canActivateDraft ? (
            <form action={activateTimetableDraft}>
              <input type="hidden" name="versionId" value={timetable.draftVersion.id} />
              <TimetableSubmitButton className="timetablePrimaryButton" type="submit" pendingLabel="Attivazione orario…">
                Metti in uso dal {formatDate(timetable.draftVersion.effectiveFrom)}
              </TimetableSubmitButton>
            </form>
          ) : (
            <Link className="timetableActivationLink" href="/orario/aggiorna#modifica-settimana">
              Cambia la data di validità
            </Link>
          )}
        </section>
      ) : null}

      {mode === 'update' ? <>
        {!showImportTool && updatePhase === 'modifica' ? <>
          <section
            className="timetableCard timetableGridCard timetableGuidedStep"
            id="modifica-settimana"
            aria-labelledby="direct-grid-title"
            data-visual-priority="operational-primary"
            data-visual-moment="prepare"
          >
            <div className="timetableCardHeading timetableGuidedHeading">
              <span>1</span>
              <div>
                <h2 id="direct-grid-title">Modifica l’orario</h2>
                <p>Le modifiche vengono salvate mentre lavori. L’orario in uso non cambia ancora.</p>
              </div>
            </div>
            <TimetableGrid
              versionId={timetable.draftVersion.id}
              days={days}
              periods={periodPresets}
              slots={timetable.slots}
              assignments={gridAssignments}
              readOnly={false}
              guided
            />
          </section>
          <div className="timetableFlowActions" data-visual-priority="decision-primary" data-visual-moment="prepare">
            <Link className="timetablePrimaryButton timetableFlowPrimary" href="/orario/aggiorna?fase=data">Continua</Link>
          </div>
        </> : null}

        {!showImportTool && updatePhase === 'data' ? (
          <section
            className="timetableGuidedDecision"
            aria-labelledby="timetable-date-title"
            data-visual-priority="decision-primary"
            data-visual-moment="prepare"
          >
            <div>
              <span className="timetableGuidedEyebrow">PASSO 2 DI 3</span>
              <h2 id="timetable-date-title">Da quando vuoi usare questo orario?</h2>
              {lifecycle.activeVersion ? <p>L’orario attuale resta in uso fino al giorno precedente.</p> : null}
            </div>
            <form action={updateTimetableDraft} className="timetableGuidedDateForm">
              <input type="hidden" name="versionId" value={timetable.draftVersion.id} />
              <input type="hidden" name="label" value={timetable.draftVersion.label} />
              <input type="hidden" name="sourceKind" value={timetable.draftVersion.sourceKind} />
              <input type="hidden" name="sourceRef" value={timetable.draftVersion.sourceRef ?? ''} />
              <input type="hidden" name="feedback" value="guided_date_saved" />
              <label>
                <span>In uso dal</span>
                <input name="effectiveFrom" type="date" defaultValue={timetable.draftVersion.effectiveFrom < minimumDraftDate ? minimumDraftDate : timetable.draftVersion.effectiveFrom} min={minimumDraftDate} max={context.academicYear.endsOn} required />
              </label>
              <div className="timetableGuidedActions">
                <Link href="/orario/aggiorna">Torna a modificare</Link>
                <TimetableSubmitButton className="timetablePrimaryButton" type="submit" pendingLabel="Salvataggio…">Continua</TimetableSubmitButton>
              </div>
            </form>
          </section>
        ) : null}

        {!showImportTool && updatePhase === 'controllo' ? <>
          <section
            className="timetableGuidedReview"
            aria-labelledby="timetable-review-title"
            data-visual-priority="operational-primary"
            data-visual-moment="review"
          >
            <div className="timetableGuidedReviewHeading">
              <div>
                <span className="timetableGuidedEyebrow">PASSO 3 DI 3</span>
                <h2 id="timetable-review-title">Questo sarà il nuovo orario</h2>
              </div>
              <strong>Dal {formatDate(timetable.draftVersion.effectiveFrom)}</strong>
            </div>
            <TimetableGrid
              versionId={timetable.draftVersion.id}
              days={days}
              periods={periodPresets}
              slots={timetable.slots}
              assignments={gridAssignments}
              readOnly
              guided
            />
          </section>

          <section
            className={`timetableGuidedDecision ${canActivateDraft ? 'ready' : 'blocked'}`}
            aria-labelledby="timetable-final-title"
            data-visual-priority="decision-primary"
            data-visual-moment="review"
          >
            <div>
              <h2 id="timetable-final-title">{canActivateDraft ? 'Vuoi metterlo in uso?' : 'Serve una data successiva'}</h2>
              <p>{canActivateDraft
                ? `Dal ${formatDate(timetable.draftVersion.effectiveFrom)} questo orario sostituirà quello attuale.`
                : lifecycle.activeVersion
                  ? `Scegli una data successiva al ${formatDate(lifecycle.activeVersion.effectiveFrom)}.`
                  : 'Controlla la data prima di continuare.'}</p>
            </div>
            <div className="timetableGuidedActions">
              <Link href="/orario/aggiorna">Torna a modificare</Link>
              {canActivateDraft ? (
                <form action={activateTimetableDraft}>
                  <input type="hidden" name="versionId" value={timetable.draftVersion.id} />
                  <TimetableSubmitButton className="timetablePrimaryButton" type="submit" pendingLabel="Attivazione…">
                    Metti in uso
                  </TimetableSubmitButton>
                </form>
              ) : (
                <Link className="timetablePrimaryButton" href="/orario/aggiorna?fase=data">Cambia la data</Link>
              )}
            </div>
          </section>
        </> : null}

        {showImportTool ? (
          <details className="timetableVersionDetails timetableOptionalImport" data-visual-priority="operational-primary" data-visual-moment="prepare" open>
                  <summary><div><strong>Importa da PDF o foto</strong><span>Sperimentale · opzionale · non serve per usare o aggiornare l’orario</span></div></summary>
                  <div className="timetableVersionDetailsBody">
                <section className="timetableCard timetableImportCard" id="importa-orario" aria-labelledby="import-title">
                  <div className="timetableCardHeading">
                    <span>02</span>
                    <div>
                      <h2 id="import-title">Importa da documento</h2>
                      <p>Percorso sperimentale: Docente OS può tentare di preparare una proposta dal documento. Se non riesce, continua a modificare direttamente la griglia: l’importazione non è un prerequisito.</p>
                    </div>
                  </div>
          
                  {importStatus ? <ImportStatus code={importStatus} /> : null}
          
                  {!importCandidate || importCandidate.state === 'APPLIED_TO_DRAFT' ? (
                    <TimetableLocalImportLauncher
                      defaultEffectiveFrom={clampDate(currentRomeDate(), context.academicYear.startsOn, context.academicYear.endsOn)}
                    />
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
                            <TimetableSubmitButton type="submit" pendingLabel="Salvataggio riga…">Salva riga</TimetableSubmitButton>
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
                          <TimetableSubmitButton type="submit" pendingLabel="Aggiunta…">Aggiungi</TimetableSubmitButton>
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
                          <TimetableSubmitButton className="timetablePrimaryButton" type="submit" pendingLabel="Applicazione…">Applica alla bozza</TimetableSubmitButton>
                        </form>
                      ) : (
                        <p className="timetableImportHint">Completa le righe da controllare. Quando tutte sono valide comparirà il pulsante di conferma.</p>
                      )}
                    </div>
                  )}
                </section>
                  </div>
                </details>
        ) : null}
      </> : null}

      {mode === 'view' ? <section
        className="timetableCard timetableGridCard"
        id="settimana-tipo"
        aria-labelledby="grid-title"
        data-visual-priority="operational-primary"
        data-visual-moment="now"
      >
        <div className="timetableCardHeading">
          <span>ORARIO</span>
          <div>
            <h2 id="grid-title">Orario attuale</h2>
            <p>Consulta la giornata o l’intera settimana.</p>
          </div>
        </div>
        <TimetableGrid
          versionId={timetable.draftVersion.id}
          days={days}
          periods={periodPresets}
          slots={operationalSlots}
          assignments={gridAssignments}
          readOnly
        />
      </section> : null}

      {mode === 'view' ? <>
      <section className="timetableViewActions" aria-label="Modifica orario">
        <div>
          <strong>Devi cambiare l’orario?</strong>
          <span>Segui tre passaggi: modifica, scegli la data, controlla e attiva.</span>
        </div>
        <Link className="primary" href="/orario/aggiorna">Modifica orario</Link>
      </section>
      {mode === 'view' ? (focusSlot ? (
        <section className="humanTaskFocus" aria-labelledby="timetable-focus-title">
          <p className="humanTaskFocusEyebrow">{currentSlot ? 'ADESSO' : 'PROSSIMA LEZIONE'}</p>
          <h2 id="timetable-focus-title">{focusSlot.title}</h2>
          <p>{focusSlot.description}</p>
          <div className="humanTaskMeta"><span>{focusSlot.time}</span><span>{focusSlot.kind}</span>{focusActivityKind ? <span>{activityKindLabel(focusActivityKind)}{focusActivityException ? ' · solo oggi' : ''}</span> : null}{focusSlot.room ? <span>Aula {focusSlot.room}</span> : null}<span>{lifecycle.activeVersion ? 'Orario in uso' : 'Bozza iniziale'}</span></div>
          <div className="humanTaskActions">{focusSlot.sectionId ? <Link className="primary" href={`/classi/${encodeURIComponent(focusSlot.sectionId)}`}>Apri la classe</Link> : <Link className="primary" href="#settimana-tipo">Vedi in griglia</Link>}{focusSlot.sectionId ? <Link href={`/piano-annuale?section=${encodeURIComponent(focusSlot.sectionId)}`}>Piano annuale</Link> : null}</div>
          {lifecycle.activeVersion && nextSlot?.slotKind === 'LESSON' ? (
            focusRecordedSession ? (
              <div className="timetableOccurrenceActivity timetableOccurrenceActivityState" role="status">
                <strong>Lezione già registrata</strong>
                <small>La tipologia di questa occorrenza fa ormai parte dello storico e non può più essere modificata.</small>
              </div>
            ) : (
              <form action={setTimetableOccurrenceActivityKind} className="timetableOccurrenceActivity">
                <input type="hidden" name="timetableSlotId" value={nextSlot.id} />
                <input type="hidden" name="localDate" value={moment.localDate} />
                <label>
                  <span>Tipo per questa lezione</span>
                  <select name="activityKind" defaultValue={focusActivityException ? focusActivityKind ?? '' : ''}>
                    <option value="">Come nell’orario · {activityKindLabel(nextSlot.activityKind ?? 'THEORY')}</option>
                    <option value="THEORY">Teoria</option>
                    <option value="DRAWING_PROJECT">Disegno / progettazione</option>
                    <option value="PRACTICAL_LAB">Pratica / laboratorio</option>
                    <option value="ASSESSMENT">Verifica / valutazione</option>
                    <option value="OTHER">Altro</option>
                  </select>
                </label>
                <TimetableSubmitButton type="submit" pendingLabel="Salvataggio…">Salva per questa lezione</TimetableSubmitButton>
                <small>Vale solo per {formatDate(moment.localDate)}. La settimana tipo non viene modificata.</small>
              </form>
            )
          ) : null}
        </section>
      ) : (
        <section className="humanTaskFocus"><p className="humanTaskFocusEyebrow">ADESSO</p><h2>{todayNoLessons ? (todayCalendarDay?.label || 'Oggi non ci sono lezioni') : 'Nessuna lezione prevista in questa fascia'}</h2><p>{todayNoLessons ? 'Il calendario scolastico indica una giornata senza lezioni: le attività della settimana tipo non vengono materializzate per oggi.' : lifecycle.activeVersion ? 'L’orario in uso non prevede una lezione adesso.' : 'Non hai ancora messo in uso una versione dell’orario: per orientarti uso temporaneamente la bozza iniziale.'}</p><div className="humanTaskActions"><Link className="primary" href="#settimana-tipo">Apri la settimana</Link></div></section>
      )) : null}

      </> : null}

      {mode === 'manage' ? <>
      <details className="timetableVersionDetails" data-visual-priority="metadata" data-visual-moment="history">
        <summary><div><strong>{lifecycle.activeVersion ? 'Orario in uso' : 'Nessun orario ancora messo in uso'}</strong><span>{lifecycle.activeVersion ? `Dal ${formatDate(lifecycle.activeVersion.effectiveFrom)} · apri per storico e dettagli` : 'Apri per vedere come funziona la prima messa in uso'}</span></div></summary>
        <div className="timetableVersionDetailsBody">
          {lifecycle.activeVersion ? <p><strong>Orario in uso.</strong> Oggi e la home leggono questa versione. La bozza che stai preparando resta separata finché non usi l’azione “Metti in uso” mostrata sopra la griglia.</p> : <p><strong>Prima messa in uso.</strong> L’azione mostrata sopra la griglia rende operativa la bozza dalla data indicata. Docente OS conserva automaticamente una nuova bozza modificabile per i cambi futuri.</p>}
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
        <summary><div><strong>{lifecycle.activeVersion ? 'Bozza per modifiche future' : 'Dettagli della bozza'}</strong><span>{lifecycle.activeVersion ? 'Non ancora in uso · ' : `${draftLabel} · `}prevista dal {formatDate(timetable.draftVersion.effectiveFrom)}</span></div></summary>
        <div className="timetableVersionDetailsBody"><form action={updateTimetableDraft} className="timetableForm versionForm"><input type="hidden" name="versionId" value={timetable.draftVersion.id} /><input type="hidden" name="feedback" value="draft_saved" /><label><span>Nome della bozza</span><input name="label" defaultValue={timetable.draftVersion.label} maxLength={160} required /></label><label><span>Prevista dal</span><input name="effectiveFrom" type="date" defaultValue={timetable.draftVersion.effectiveFrom} min={context.academicYear.startsOn} max={context.academicYear.endsOn} required /></label><label><span>Da dove deriva</span><select name="sourceKind" defaultValue={timetable.draftVersion.sourceKind}><option value="MANUAL">Inserimento manuale</option><option value="INSTITUTION_DOCUMENT">Documento istituzionale</option><option value="IMPORT">Importazione</option></select></label><label className="wideField"><span>Riferimento della fonte</span><input name="sourceRef" defaultValue={timetable.draftVersion.sourceRef ?? ''} maxLength={1000} placeholder="Opzionale: circolare, file, nota…" /></label><TimetableSubmitButton className="timetablePrimaryButton" type="submit" pendingLabel="Salvataggio bozza…">Salva bozza</TimetableSubmitButton></form></div>
      </details>
      </> : null}
    </AppShell>
  )
}

function buildPeriods(startTime: string, durationMinutes: number, count: number) { const first = timeToMinutes(startTime); return Array.from({ length: count }, (_, index) => ({ ordinal: index + 1, start: minutesToTime(first + index * durationMinutes), end: minutesToTime(first + (index + 1) * durationMinutes) })) }
function sectionLabel(grade: keyof typeof GRADE_LABELS, sectionCode: string) { return `${GRADE_LABELS[grade]} ${sectionCode}` }
function versionStatusLabel(value: string) { if (value === 'DRAFT') return 'Bozza'; if (value === 'ACTIVE') return 'In uso'; if (value === 'ARCHIVED') return 'Precedente'; return value }
function formatHours(minutes: number) { if (!minutes) return '0h'; const hours = Math.floor(minutes / 60); const rest = minutes % 60; if (!hours) return `${rest}m`; return rest ? `${hours}h ${rest}m` : `${hours}h` }
function formatDate(value: string) { const [year, month, day] = value.split('-'); return `${day}/${month}/${year}` }
function nextIsoDate(value: string) { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10) }
function currentRomeMoment() { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[value.weekday] ?? 7; return { localDate: `${value.year}-${value.month}-${value.day}`, weekday, minutes: Number(value.hour) * 60 + Number(value.minute) } }
function describeSlot(slot: { sectionId: string | null; disciplineId: string | null; manualClassLabel: string | null; slotKind: string; startTime: string; endTime: string; room: string | null }, sectionById: Map<string, { grade: keyof typeof GRADE_LABELS; sectionCode: string }>, disciplineById: Map<string, { name: string }>) { const section = slot.sectionId ? sectionById.get(slot.sectionId) : null; const discipline = slot.disciplineId ? disciplineById.get(slot.disciplineId) : null; const title = section ? sectionLabel(section.grade, section.sectionCode) : slot.manualClassLabel || presenceLabel(slot.slotKind); return { title, sectionId: section ? slot.sectionId : null, time: `${slot.startTime.slice(0, 5)}–${slot.endTime.slice(0, 5)}`, kind: discipline?.name || presenceLabel(slot.slotKind), room: slot.room, description: section ? `Questa è la lezione pertinente nell’orario che vale adesso. Entra nella classe per vedere il prossimo tratto didattico e i materiali utili.` : `Questa presenza appartiene all’orario che vale adesso e non crea una classe canonica.` } }
function presenceLabel(kind: string) { if (kind === 'DISPOSITION') return 'Disposizione'; if (kind === 'RECEPTION') return 'Ricevimento'; if (kind === 'CLASS_PRESENCE') return 'Presenza in classe'; return 'Impegno' }
function activityKindLabel(kind: string) { if (kind === 'DRAWING_PROJECT') return 'Disegno / progettazione'; if (kind === 'PRACTICAL_LAB') return 'Pratica / laboratorio'; if (kind === 'ASSESSMENT') return 'Verifica / valutazione'; if (kind === 'OTHER') return 'Altro'; return 'Teoria' }

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

function TimetableActionFeedback({ code }: { code: string }) {
  const messages: Record<string, { title: string; detail: string }> = {
    validity_saved: {
      title: 'Data salvata',
      detail: 'La decorrenza della bozza è stata aggiornata.',
    },
    draft_saved: {
      title: 'Bozza salvata',
      detail: 'Le impostazioni della bozza sono state registrate.',
    },
    occurrence_saved: {
      title: 'Lezione aggiornata',
      detail: 'La tipologia scelta vale per questa lezione. La settimana tipo resta invariata.',
    },
    timetable_activated: {
      title: 'Orario messo in uso',
      detail: 'Questa è la versione che vale adesso. Le modifiche future partiranno da una nuova bozza.',
    },
  }
  const message = messages[code]
  if (!message) return null
  return (
    <TransientFeedback
      title={message.title}
      message={message.detail}
      tone="success"
    />
  )
}

function ImportStatus({ code }: { code: string }) {
  const messages: Record<string, { tone: string; title: string; detail: string }> = {
    applied: { tone: 'success', title: 'Orario applicato alla bozza', detail: 'La bozza è stata aggiornata. L’orario in uso non è stato attivato né modificato.' },
    review: { tone: 'info', title: 'Proposta pronta', detail: 'Controlla le righe sotto e correggi solo ciò che serve.' },
    row_saved: { tone: 'success', title: 'Riga salvata', detail: 'La correzione è stata registrata. Puoi continuare con le altre righe oppure confermare la proposta.' },
    row_added: { tone: 'success', title: 'Lezione aggiunta', detail: 'La nuova riga è stata registrata nella proposta da controllare.' },
    conflict: { tone: 'warning', title: 'La bozza è cambiata', detail: 'Nessuna modifica è stata applicata. Ricarica la proposta prima di confermare.' },
    review_stale: { tone: 'warning', title: 'La proposta è stata aggiornata', detail: 'Questa pagina mostra una revisione precedente. Riapri la proposta e controlla la versione aggiornata prima di confermare.' },
    already_applied: { tone: 'info', title: 'Documento già applicato', detail: 'Questo stesso documento risulta già applicato alla bozza.' },
    replace_confirmation_required: { tone: 'warning', title: 'Esiste già una proposta revisionata', detail: 'La proposta esistente contiene correzioni del docente. Per sostituirla con una nuova estrazione devi confermarlo esplicitamente prima di analizzare di nuovo il documento.' },
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
    persist_failed: { tone: 'warning', title: 'Proposta non salvata', detail: 'La preparazione è stata annullata senza sostituire la proposta esistente. Riprova oppure riapri la proposta già presente.' },
    unavailable: { tone: 'warning', title: 'Proposta non disponibile', detail: 'Riapri l’importazione partendo dal documento.' },
  }
  const message = messages[code]
  if (!message) return null
  return <div className={'timetableImportStatus ' + message.tone} role="status"><strong>{message.title}</strong><span>{message.detail}</span></div>
}
