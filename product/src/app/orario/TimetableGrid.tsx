'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { TimetablePresenceKind, TimetableSlot, TimetableSlotKind } from '@/core/domain/timetable'
import { addClassPresenceSlot, addLessonSlot, addSpecialSlot, deleteTimetableSlot, updateTimetableSlot } from './actions'
import { buildTimetableGridRows, timetableCellKey, type TimetableGridPeriod } from './timetable-grid-model'
import { isCurrentTimetableInterval, isCurrentTimetableRow, type TimetableMoment } from './timetable-operational-model'

export type TimetableGridDay = {
  value: number
  label: string
  short: string
}

export type TimetableGridAssignment = {
  id: string
  sectionId: string
  label: string
  classLabel: string
  disciplineLabel: string
  status: 'PROVISIONAL' | 'CONFIRMED'
  weeklyMinutes: number
  scheduledMinutes: number
}

type TimetableGridProps = {
  versionId: string
  days: TimetableGridDay[]
  periods: TimetableGridPeriod[]
  slots: TimetableSlot[]
  assignments: TimetableGridAssignment[]
}

type EditorState = {
  mode: 'create' | 'edit'
  slotId: string | null
  weekday: number
  startTime: string
  endTime: string
  ordinal: number | null
  kind: TimetableSlotKind
  assignmentId: string
  manualClassLabel: string
  presenceKind: TimetablePresenceKind
  room: string
  note: string
}

const KIND_LABELS: Record<TimetableSlotKind, string> = {
  LESSON: 'Lezione della mia cattedra',
  CLASS_PRESENCE: 'Presenza in altra classe',
  DISPOSITION: 'Disposizione',
  RECEPTION: 'Ricevimento',
  OTHER: 'Altro',
}

const PRESENCE_LABELS: Record<TimetablePresenceKind, string> = {
  SUBSTITUTION: 'Supplenza',
  CO_TEACHING: 'Compresenza',
  SUPERVISION: 'Sorveglianza / assistenza',
  PROJECT: 'Progetto / attività',
  OTHER: 'Altra presenza',
}

export default function TimetableGrid({ versionId, days, periods, slots, assignments }: TimetableGridProps) {
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [selectedDay, setSelectedDay] = useState(days[0]?.value ?? 1)
  const [moment, setMoment] = useState<TimetableMoment | null>(null)
  const [focusedSlotId, setFocusedSlotId] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setMoment({ weekday: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() })
    }
    const frame = window.requestAnimationFrame(() => {
      const today = new Date().getDay()
      updateClock()
      if (days.some((day) => day.value === today)) setSelectedDay(today)
      if (window.matchMedia('(max-width: 719px)').matches) setViewMode('day')
    })
    const timer = window.setInterval(updateClock, 60_000)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearInterval(timer)
    }
  }, [days])

  useEffect(() => {
    if (!editor && !focusedSlotId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditor(null)
        setFocusedSlotId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor, focusedSlotId])

  const rows = useMemo(() => buildTimetableGridRows(periods, slots), [periods, slots])
  const visibleDays = viewMode === 'week' ? days : days.filter((day) => day.value === selectedDay)
  const slotByCell = useMemo(
    () => new Map(slots.map((slot) => [timetableCellKey(slot.weekday, slot.startTime, slot.endTime), slot])),
    [slots],
  )
  const assignmentById = useMemo(() => new Map(assignments.map((assignment) => [assignment.id, assignment])), [assignments])
  const focusedSlot = focusedSlotId ? slots.find((slot) => slot.id === focusedSlotId) ?? null : null
  const focusedAssignment = focusedSlot?.teachingAssignmentId ? assignmentById.get(focusedSlot.teachingAssignmentId) : undefined
  const selectedDayIndex = Math.max(0, days.findIndex((day) => day.value === selectedDay))
  const unresolvedAssignments = assignments.filter((assignment) => assignment.weeklyMinutes !== assignment.scheduledMinutes).length

  function openEmptyCell(weekday: number, startTime: string, endTime: string, ordinal: number | null) {
    setEditor({
      mode: 'create',
      slotId: null,
      weekday,
      startTime,
      endTime,
      ordinal,
      kind: 'LESSON',
      assignmentId: assignments[0]?.id ?? '',
      manualClassLabel: '',
      presenceKind: 'SUBSTITUTION',
      room: '',
      note: '',
    })
  }

  function openOccupiedCell(slot: TimetableSlot) {
    setEditor({
      mode: 'edit',
      slotId: slot.id,
      weekday: slot.weekday,
      startTime: slot.startTime,
      endTime: slot.endTime,
      ordinal: slot.ordinal,
      kind: slot.slotKind,
      assignmentId: slot.teachingAssignmentId ?? assignments[0]?.id ?? '',
      manualClassLabel: slot.manualClassLabel ?? '',
      presenceKind: slot.presenceKind ?? 'SUBSTITUTION',
      room: slot.room ?? '',
      note: slot.note ?? '',
    })
  }

  function editFocusedSlot() {
    if (!focusedSlot) return
    setFocusedSlotId(null)
    openOccupiedCell(focusedSlot)
  }

  function navigateDay(offset: number) {
    const next = Math.max(0, Math.min(days.length - 1, selectedDayIndex + offset))
    const day = days[next]
    if (day) setSelectedDay(day.value)
  }

  async function createSlot(formData: FormData) {
    if (!editor) return
    if (editor.kind === 'LESSON') await addLessonSlot(formData)
    else if (editor.kind === 'CLASS_PRESENCE') await addClassPresenceSlot(formData)
    else await addSpecialSlot(formData)
    setEditor(null)
  }

  async function updateSlot(formData: FormData) {
    await updateTimetableSlot(formData)
    setEditor(null)
  }

  async function removeSlot(formData: FormData) {
    await deleteTimetableSlot(formData)
    setEditor(null)
  }

  return (
    <div className="visualTimetable">
      <div className="visualTimetableToolbar">
        <div className="viewSwitch" role="group" aria-label="Modalità visualizzazione">
          <button className={viewMode === 'week' ? 'active' : ''} type="button" onClick={() => setViewMode('week')}>Settimana</button>
          <button className={viewMode === 'day' ? 'active' : ''} type="button" onClick={() => setViewMode('day')}>Giorno</button>
        </div>

        {viewMode === 'day' ? (
          <div className="dayNavigator" aria-label="Navigazione giorni">
            <button type="button" onClick={() => navigateDay(-1)} disabled={selectedDayIndex <= 0} aria-label="Giorno precedente">‹</button>
            <strong>{visibleDays[0]?.label ?? 'Giorno'}</strong>
            <button type="button" onClick={() => navigateDay(1)} disabled={selectedDayIndex >= days.length - 1} aria-label="Giorno successivo">›</button>
          </div>
        ) : <span className="gridHint">Tocca una voce per aprire il contesto</span>}

        <button className="printTimetableButton" type="button" onClick={() => window.print()}>Stampa</button>
      </div>

      <div className="visualTimetableScroller">
        <div
          className="visualTimetableGrid"
          role="table"
          aria-label="Orario settimanale"
          style={{ gridTemplateColumns: `92px repeat(${Math.max(visibleDays.length, 1)}, minmax(138px, 1fr))` }}
        >
          <div className="gridRowContents" role="row">
            <div className="timeHeader" role="columnheader">Ora</div>
            {visibleDays.map((day) => (
              <div className={`dayHeader ${day.value === moment?.weekday ? 'today' : ''}`} role="columnheader" key={day.value}>
                <strong>{viewMode === 'week' ? day.short : day.label}</strong>
                {day.value === moment?.weekday ? <span>Oggi</span> : null}
              </div>
            ))}
          </div>

          {rows.map((row) => {
            const rowCurrent = isCurrentTimetableRow(row.start, row.end, moment)
            return (
              <div className="gridRowContents" role="row" key={row.key}>
                <div className={`timeCell ${rowCurrent ? 'currentTime' : ''}`} role="rowheader">
                  <strong>{row.ordinal ? `${row.ordinal}ª` : row.start}</strong>
                  <span>{row.start}–{row.end}</span>
                  {rowCurrent ? <small>adesso</small> : row.source === 'CUSTOM' ? <small>fascia personalizzata</small> : null}
                </div>
                {visibleDays.map((day) => {
                  const slot = slotByCell.get(timetableCellKey(day.value, row.start, row.end))
                  const current = slot ? isCurrentTimetableInterval(day.value, slot.startTime, slot.endTime, moment) : false
                  const emptyCurrent = !slot && day.value === moment?.weekday && rowCurrent
                  return (
                    <div role="cell" key={`${day.value}-${row.key}`}>
                      {slot ? (
                        <OccupiedCell
                          slot={slot}
                          assignment={slot.teachingAssignmentId ? assignmentById.get(slot.teachingAssignmentId) : undefined}
                          current={current}
                          onClick={() => setFocusedSlotId(slot.id)}
                        />
                      ) : (
                        <button
                          className={`emptyTimetableCell ${emptyCurrent ? 'currentEmpty' : ''}`}
                          type="button"
                          aria-label={`Aggiungi attività: ${day.label}, ${row.start}–${row.end}`}
                          onClick={() => openEmptyCell(day.value, row.start, row.end, row.ordinal)}
                        >
                          <span aria-hidden>＋</span><small>{emptyCurrent ? 'Ora attuale · aggiungi' : 'Aggiungi'}</small>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {!rows.length ? <div className="timetableEmpty"><strong>Configura la scansione oraria</strong><span>Le fasce della griglia derivano dalle Impostazioni.</span></div> : null}

      <div className="timetableLegend" aria-label="Legenda">
        <span><i className="legendLesson" /> Lezione</span>
        <span><i className="legendPresence" /> Presenza in altra classe</span>
        <span><i className="legendDisposition" /> Disposizione</span>
        <span><i className="legendReception" /> Ricevimento</span>
        <span><i className="legendOther" /> Altro</span>
      </div>

      {assignments.length ? (
        <details className="capacityDisclosure">
          <summary>
            <span>Controllo monte ore</span>
            <strong>{unresolvedAssignments ? `${unresolvedAssignments} ${unresolvedAssignments === 1 ? 'voce da allineare' : 'voci da allineare'}` : 'Cattedra allineata'}</strong>
          </summary>
          <div className="capacityStrip" aria-label="Verifica monte ore">
            {assignments.map((assignment) => {
              const delta = assignment.weeklyMinutes - assignment.scheduledMinutes
              return (
                <div key={assignment.id} className={`capacityChip ${delta === 0 ? 'ok' : delta < 0 ? 'over' : 'pending'}`}>
                  <strong>{assignment.label}</strong>
                  <span>{assignment.scheduledMinutes}/{assignment.weeklyMinutes} min · {delta === 0 ? 'allineata' : delta > 0 ? `mancano ${delta}` : `eccesso ${Math.abs(delta)}`}</span>
                </div>
              )
            })}
          </div>
        </details>
      ) : null}

      {focusedSlot ? (
        <div className="timetableContextBackdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setFocusedSlotId(null) }}>
          <section className="timetableContextSheet" role="dialog" aria-modal="true" aria-labelledby="timetable-context-title">
            <div className="timetableContextHeading">
              <div>
                <span>{days.find((day) => day.value === focusedSlot.weekday)?.label ?? 'Giorno'} · {focusedSlot.startTime}–{focusedSlot.endTime}</span>
                <h3 id="timetable-context-title">{contextTitle(focusedSlot, focusedAssignment)}</h3>
                <p>{contextSubtitle(focusedSlot, focusedAssignment)}</p>
              </div>
              <button type="button" aria-label="Chiudi" onClick={() => setFocusedSlotId(null)}>×</button>
            </div>

            {focusedSlot.room || focusedSlot.note ? (
              <div className="timetableContextMeta">
                {focusedSlot.room ? <span><strong>Aula</strong>{focusedSlot.room}</span> : null}
                {focusedSlot.note ? <span><strong>Nota</strong>{focusedSlot.note}</span> : null}
              </div>
            ) : null}

            {focusedSlot.slotKind === 'CLASS_PRESENCE' ? <p className="timetableContextHint">Questa è una presenza registrata manualmente nell’Orario: non crea una classe nella tua Cattedra.</p> : null}

            <div className="timetableContextActions">
              {focusedSlot.slotKind === 'LESSON' && focusedAssignment ? (
                <Link className="timetablePrimaryButton contextPrimaryAction" href={`/piano-annuale?section=${encodeURIComponent(focusedAssignment.sectionId)}`}>Apri Piano annuale</Link>
              ) : null}
              <button className="secondaryButton" type="button" onClick={editFocusedSlot}>Modifica orario</button>
            </div>
          </section>
        </div>
      ) : null}

      {editor ? (
        <div className="timetableEditorBackdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditor(null) }}>
          <section className="timetableEditor" role="dialog" aria-modal="true" aria-labelledby="timetable-editor-title">
            <div className="timetableEditorHeading">
              <div><span>{editor.mode === 'create' ? 'Nuova voce' : 'Modifica voce'}</span><h3 id="timetable-editor-title">{days.find((day) => day.value === editor.weekday)?.label ?? 'Giorno'} · {editor.startTime}–{editor.endTime}</h3></div>
              <button type="button" aria-label="Chiudi" onClick={() => setEditor(null)}>×</button>
            </div>

            <form action={editor.mode === 'create' ? createSlot : updateSlot} className="timetableEditorForm">
              <input type="hidden" name="versionId" value={versionId} />
              {editor.slotId ? <input type="hidden" name="slotId" value={editor.slotId} /> : null}

              <label className="editorWide"><span>Che cosa fai in quest’ora?</span><select name="kind" value={editor.kind} onChange={(event) => setEditor((current) => current ? { ...current, kind: event.target.value as TimetableSlotKind } : current)}>{Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Giorno</span><select name="weekday" value={editor.weekday} onChange={(event) => setEditor((current) => current ? { ...current, weekday: Number(event.target.value) } : current)}>{days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
              <label><span>Ora n.</span><input name="ordinal" type="number" min="1" max="20" value={editor.ordinal ?? ''} onChange={(event) => setEditor((current) => current ? { ...current, ordinal: event.target.value ? Number(event.target.value) : null } : current)} /></label>
              <label><span>Inizio</span><input name="startTime" type="time" value={editor.startTime} onChange={(event) => setEditor((current) => current ? { ...current, startTime: event.target.value } : current)} required /></label>
              <label><span>Fine</span><input name="endTime" type="time" value={editor.endTime} onChange={(event) => setEditor((current) => current ? { ...current, endTime: event.target.value } : current)} required /></label>

              {editor.kind === 'LESSON' ? (
                <>
                  <label className="editorWide"><span>Classe e disciplina della tua cattedra</span><select name="assignmentId" value={editor.assignmentId} onChange={(event) => setEditor((current) => current ? { ...current, assignmentId: event.target.value } : current)} required>{assignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.label}{assignment.status === 'PROVISIONAL' ? ' · da confermare' : ''}</option>)}</select></label>
                  <label><span>Aula <small>facoltativa</small></span><input name="room" maxLength={80} value={editor.room} onChange={(event) => setEditor((current) => current ? { ...current, room: event.target.value } : current)} /></label>
                </>
              ) : editor.kind === 'CLASS_PRESENCE' ? (
                <>
                  <label><span>Classe</span><input name="manualClassLabel" maxLength={12} value={editor.manualClassLabel} onChange={(event) => setEditor((current) => current ? { ...current, manualClassLabel: event.target.value.toUpperCase() } : current)} placeholder="Es. 3B" required /></label>
                  <label><span>Tipo di presenza</span><select name="presenceKind" value={editor.presenceKind} onChange={(event) => setEditor((current) => current ? { ...current, presenceKind: event.target.value as TimetablePresenceKind } : current)}>{Object.entries(PRESENCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="editorWide"><span>Aula <small>facoltativa</small></span><input name="room" maxLength={80} value={editor.room} onChange={(event) => setEditor((current) => current ? { ...current, room: event.target.value } : current)} /></label>
                </>
              ) : null}

              <label className="editorWide"><span>Nota <small>facoltativa</small></span><input name="note" maxLength={1000} value={editor.note} onChange={(event) => setEditor((current) => current ? { ...current, note: event.target.value } : current)} placeholder="Solo se ti serve un promemoria" /></label>

              {editor.kind === 'LESSON' && !assignments.length ? <p className="editorWarning">Per una lezione della tua cattedra serve prima almeno una associazione in Impostazioni. Puoi comunque registrare una presenza in altra classe.</p> : null}

              <div className="timetableEditorActions">
                <button className="secondaryButton" type="button" onClick={() => setEditor(null)}>Annulla</button>
                <button className="timetablePrimaryButton" type="submit" disabled={editor.kind === 'LESSON' && !assignments.length}>{editor.mode === 'create' ? 'Aggiungi all’orario' : 'Salva modifiche'}</button>
              </div>
            </form>

            {editor.mode === 'edit' && editor.slotId ? (
              <form action={removeSlot} className="editorDeleteForm">
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="slotId" value={editor.slotId} />
                <button className="textDangerButton" type="submit">Rimuovi dall’orario</button>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}

function contextTitle(slot: TimetableSlot, assignment?: TimetableGridAssignment) {
  if (slot.slotKind === 'LESSON') return assignment?.classLabel ?? 'Lezione'
  if (slot.slotKind === 'CLASS_PRESENCE') return slot.manualClassLabel ?? 'Classe'
  return KIND_LABELS[slot.slotKind]
}

function contextSubtitle(slot: TimetableSlot, assignment?: TimetableGridAssignment) {
  if (slot.slotKind === 'LESSON') return assignment?.disciplineLabel ?? 'Lezione della cattedra'
  if (slot.slotKind === 'CLASS_PRESENCE') return slot.presenceKind ? PRESENCE_LABELS[slot.presenceKind] : 'Presenza in altra classe'
  return 'Impegno ricorrente della settimana tipo'
}

function OccupiedCell({ slot, assignment, current, onClick }: { slot: TimetableSlot; assignment?: TimetableGridAssignment; current: boolean; onClick: () => void }) {
  if (slot.slotKind === 'CLASS_PRESENCE') {
    const presence = slot.presenceKind ? PRESENCE_LABELS[slot.presenceKind] : 'Presenza'
    const classLabel = slot.manualClassLabel ?? 'Classe'
    const meta = [slot.room ? `Aula ${slot.room}` : null, slot.note].filter(Boolean).join(' · ')
    return (
      <button className={`occupiedTimetableCell kind-class_presence ${current ? 'currentSlot' : ''}`} type="button" onClick={onClick} aria-label={`${classLabel}, ${presence}, ${slot.startTime}–${slot.endTime}`}>
        <span className="cellKind">Presenza in altra classe</span>
        <strong className="cellPrimary">{classLabel}</strong>
        <span className="cellSecondary">{presence}</span>
        {meta ? <small>{meta}</small> : null}
        {current ? <b className="cellNow">Adesso</b> : null}
      </button>
    )
  }

  if (slot.slotKind === 'LESSON') {
    const classLabel = assignment?.classLabel ?? assignment?.label ?? 'Lezione'
    const disciplineLabel = assignment?.disciplineLabel ?? 'Lezione'
    const meta = [slot.room ? `Aula ${slot.room}` : null, slot.note].filter(Boolean).join(' · ')
    return (
      <button className={`occupiedTimetableCell kind-lesson ${current ? 'currentSlot' : ''}`} type="button" onClick={onClick} aria-label={`${classLabel}, ${disciplineLabel}, ${slot.startTime}–${slot.endTime}`}>
        <span className="cellKind">Lezione</span>
        <strong className="cellPrimary">{classLabel}</strong>
        <span className="cellSecondary">{disciplineLabel}</span>
        {meta ? <small>{meta}</small> : null}
        {current ? <b className="cellNow">Adesso</b> : null}
      </button>
    )
  }

  const title = KIND_LABELS[slot.slotKind]
  return (
    <button className={`occupiedTimetableCell kind-${slot.slotKind.toLowerCase()} ${current ? 'currentSlot' : ''}`} type="button" onClick={onClick} aria-label={`${title}, ${slot.startTime}–${slot.endTime}`}>
      <span className="cellKind">Impegno</span>
      <strong className="cellPrimary">{title}</strong>
      {slot.note ? <span className="cellSecondary">{slot.note}</span> : null}
      {current ? <b className="cellNow">Adesso</b> : null}
    </button>
  )
}
