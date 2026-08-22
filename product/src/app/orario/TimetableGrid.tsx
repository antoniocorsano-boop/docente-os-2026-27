'use client'

import { useEffect, useMemo, useState } from 'react'
import type { TimetableSlot, TimetableSlotKind } from '@/core/domain/timetable'
import { addLessonSlot, addSpecialSlot, deleteTimetableSlot, updateTimetableSlot } from './actions'
import { buildTimetableGridRows, timetableCellKey, type TimetableGridPeriod } from './timetable-grid-model'

export type TimetableGridDay = {
  value: number
  label: string
  short: string
}

export type TimetableGridAssignment = {
  id: string
  label: string
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
  room: string
  note: string
}

const KIND_LABELS: Record<TimetableSlotKind, string> = {
  LESSON: 'Lezione',
  DISPOSITION: 'Disposizione',
  RECEPTION: 'Ricevimento',
  OTHER: 'Altro',
}

export default function TimetableGrid({ versionId, days, periods, slots, assignments }: TimetableGridProps) {
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [selectedDay, setSelectedDay] = useState(days[0]?.value ?? 1)
  const [todayWeekday, setTodayWeekday] = useState<number | null>(null)
  const [editor, setEditor] = useState<EditorState | null>(null)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const today = new Date().getDay()
      if (days.some((day) => day.value === today)) {
        setTodayWeekday(today)
        setSelectedDay(today)
      }
      if (window.matchMedia('(max-width: 719px)').matches) setViewMode('day')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [days])

  useEffect(() => {
    if (!editor) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditor(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editor])

  const rows = useMemo(() => buildTimetableGridRows(periods, slots), [periods, slots])
  const visibleDays = viewMode === 'week' ? days : days.filter((day) => day.value === selectedDay)
  const slotByCell = useMemo(
    () => new Map(slots.map((slot) => [timetableCellKey(slot.weekday, slot.startTime, slot.endTime), slot])),
    [slots],
  )
  const assignmentById = useMemo(() => new Map(assignments.map((assignment) => [assignment.id, assignment])), [assignments])
  const selectedDayIndex = Math.max(0, days.findIndex((day) => day.value === selectedDay))

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
      room: slot.room ?? '',
      note: slot.note ?? '',
    })
  }

  function navigateDay(offset: number) {
    const next = Math.max(0, Math.min(days.length - 1, selectedDayIndex + offset))
    const day = days[next]
    if (day) setSelectedDay(day.value)
  }

  async function createSlot(formData: FormData) {
    if (!editor) return
    if (editor.kind === 'LESSON') await addLessonSlot(formData)
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
        ) : <span className="gridHint">Seleziona una cella per configurarla</span>}

        <button className="printTimetableButton" type="button" onClick={() => window.print()}>Stampa</button>
      </div>

      {assignments.length ? (
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
      ) : null}

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
              <div className={`dayHeader ${day.value === todayWeekday ? 'today' : ''}`} role="columnheader" key={day.value}>
                <strong>{viewMode === 'week' ? day.short : day.label}</strong>
                {day.value === todayWeekday ? <span>Oggi</span> : null}
              </div>
            ))}
          </div>

          {rows.map((row) => (
            <div className="gridRowContents" role="row" key={row.key}>
              <div className="timeCell" role="rowheader">
                <strong>{row.ordinal ? `${row.ordinal}ª` : row.start}</strong>
                <span>{row.start}–{row.end}</span>
                {row.source === 'CUSTOM' ? <small>fascia personalizzata</small> : null}
              </div>
              {visibleDays.map((day) => {
                const slot = slotByCell.get(timetableCellKey(day.value, row.start, row.end))
                return (
                  <div role="cell" key={`${day.value}-${row.key}`}>
                    {slot ? (
                      <OccupiedCell slot={slot} assignment={slot.teachingAssignmentId ? assignmentById.get(slot.teachingAssignmentId) : undefined} onClick={() => openOccupiedCell(slot)} />
                    ) : (
                      <button
                        className="emptyTimetableCell"
                        type="button"
                        aria-label={`Aggiungi attività: ${day.label}, ${row.start}–${row.end}`}
                        onClick={() => openEmptyCell(day.value, row.start, row.end, row.ordinal)}
                      >
                        <span aria-hidden>＋</span><small>Aggiungi</small>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {!rows.length ? <div className="timetableEmpty"><strong>Configura la scansione oraria</strong><span>Le fasce della griglia derivano dalle Impostazioni.</span></div> : null}

      <div className="timetableLegend" aria-label="Legenda">
        <span><i className="legendLesson" /> Lezione</span>
        <span><i className="legendDisposition" /> Disposizione</span>
        <span><i className="legendReception" /> Ricevimento</span>
        <span><i className="legendOther" /> Altro</span>
      </div>

      {editor ? (
        <div className="timetableEditorBackdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditor(null) }}>
          <section className="timetableEditor" role="dialog" aria-modal="true" aria-labelledby="timetable-editor-title">
            <div className="timetableEditorHeading">
              <div><span>{editor.mode === 'create' ? 'Nuovo slot' : 'Modifica slot'}</span><h3 id="timetable-editor-title">{days.find((day) => day.value === editor.weekday)?.label ?? 'Giorno'} · {editor.startTime}–{editor.endTime}</h3></div>
              <button type="button" aria-label="Chiudi" onClick={() => setEditor(null)}>×</button>
            </div>

            <form action={editor.mode === 'create' ? createSlot : updateSlot} className="timetableEditorForm">
              <input type="hidden" name="versionId" value={versionId} />
              {editor.slotId ? <input type="hidden" name="slotId" value={editor.slotId} /> : null}

              <label><span>Tipo attività</span><select name="kind" value={editor.kind} onChange={(event) => setEditor((current) => current ? { ...current, kind: event.target.value as TimetableSlotKind } : current)}>{Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Giorno</span><select name="weekday" value={editor.weekday} onChange={(event) => setEditor((current) => current ? { ...current, weekday: Number(event.target.value) } : current)}>{days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label>
              <label><span>Inizio</span><input name="startTime" type="time" value={editor.startTime} onChange={(event) => setEditor((current) => current ? { ...current, startTime: event.target.value } : current)} required /></label>
              <label><span>Fine</span><input name="endTime" type="time" value={editor.endTime} onChange={(event) => setEditor((current) => current ? { ...current, endTime: event.target.value } : current)} required /></label>
              <label><span>Ora n.</span><input name="ordinal" type="number" min="1" max="20" value={editor.ordinal ?? ''} onChange={(event) => setEditor((current) => current ? { ...current, ordinal: event.target.value ? Number(event.target.value) : null } : current)} /></label>

              {editor.kind === 'LESSON' ? (
                <>
                  <label className="editorWide"><span>Cattedra</span><select name="assignmentId" value={editor.assignmentId} onChange={(event) => setEditor((current) => current ? { ...current, assignmentId: event.target.value } : current)} required>{assignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.label}{assignment.status === 'PROVISIONAL' ? ' · provvisoria' : ''}</option>)}</select></label>
                  <label><span>Aula</span><input name="room" maxLength={80} value={editor.room} onChange={(event) => setEditor((current) => current ? { ...current, room: event.target.value } : current)} /></label>
                </>
              ) : (
                <><input type="hidden" name="assignmentId" value="" /><input type="hidden" name="room" value="" /></>
              )}

              <label className="editorWide"><span>Nota</span><input name="note" maxLength={1000} value={editor.note} onChange={(event) => setEditor((current) => current ? { ...current, note: event.target.value } : current)} placeholder="Opzionale" /></label>

              {editor.kind === 'LESSON' && !assignments.length ? <p className="editorWarning">Definisci prima almeno una voce di cattedra.</p> : null}

              <div className="timetableEditorActions">
                <button className="secondaryButton" type="button" onClick={() => setEditor(null)}>Annulla</button>
                <button className="timetablePrimaryButton" type="submit" disabled={editor.kind === 'LESSON' && !assignments.length}>{editor.mode === 'create' ? 'Aggiungi alla griglia' : 'Salva modifiche'}</button>
              </div>
            </form>

            {editor.mode === 'edit' && editor.slotId ? (
              <form action={removeSlot} className="editorDeleteForm">
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="slotId" value={editor.slotId} />
                <button className="textDangerButton" type="submit">Rimuovi questo slot</button>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  )
}

function OccupiedCell({ slot, assignment, onClick }: { slot: TimetableSlot; assignment?: TimetableGridAssignment; onClick: () => void }) {
  const special = slot.slotKind !== 'LESSON'
  const title = special ? KIND_LABELS[slot.slotKind] : assignment?.label ?? 'Lezione'
  const subtitle = special ? slot.note || 'Impegno non didattico' : [slot.room ? `Aula ${slot.room}` : null, slot.note].filter(Boolean).join(' · ')

  return (
    <button className={`occupiedTimetableCell kind-${slot.slotKind.toLowerCase()}`} type="button" onClick={onClick} aria-label={`${title}, ${slot.startTime}–${slot.endTime}`}>
      <span className="cellKind">{special ? KIND_LABELS[slot.slotKind] : 'Lezione'}</span>
      <strong>{title}</strong>
      <small>{subtitle || `${slot.startTime}–${slot.endTime}`}</small>
      {slot.ordinal ? <b>{slot.ordinal}ª ora</b> : null}
    </button>
  )
}
