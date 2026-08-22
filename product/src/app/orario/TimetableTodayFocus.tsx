'use client'

import { useEffect, useMemo, useState } from 'react'
import type { TimetableSlot } from '@/core/domain/timetable'
import type { TimetableGridAssignment, TimetableGridDay } from './TimetableGrid'

type Props = {
  days: TimetableGridDay[]
  slots: TimetableSlot[]
  assignments: TimetableGridAssignment[]
}

const SPECIAL_LABELS = {
  DISPOSITION: 'Disposizione',
  RECEPTION: 'Ricevimento',
  OTHER: 'Altro',
} as const

export default function TimetableTodayFocus({ days, slots, assignments }: Props) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const update = () => setNow(new Date())
    update()
    const timer = window.setInterval(update, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const assignmentById = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.id, assignment])),
    [assignments],
  )

  if (!now) return null

  const weekday = now.getDay()
  const day = days.find((item) => item.value === weekday)
  const todaySlots = slots
    .filter((slot) => slot.weekday === weekday)
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  if (!day) {
    return (
      <section className="todayFocus quiet" aria-label="Oggi nella settimana tipo">
        <div className="todayFocusIntro">
          <span>OGGI NELLA SETTIMANA TIPO</span>
          <strong>Nessuna giornata prevista</strong>
          <small>La settimana ricorrente non prevede lezioni oggi.</small>
        </div>
      </section>
    )
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  return (
    <section className="todayFocus" aria-label="Oggi nella settimana tipo">
      <div className="todayFocusIntro">
        <span>OGGI NELLA SETTIMANA TIPO</span>
        <strong>{day.label}</strong>
        <small>{todaySlots.length ? `${todaySlots.length} ${todaySlots.length === 1 ? 'impegno ricorrente' : 'impegni ricorrenti'}` : 'Nessun impegno ricorrente'}</small>
      </div>

      {todaySlots.length ? (
        <div className="todayFocusTimeline">
          {todaySlots.map((slot) => {
            const assignment = slot.teachingAssignmentId ? assignmentById.get(slot.teachingAssignmentId) : undefined
            const start = toMinutes(slot.startTime)
            const end = toMinutes(slot.endTime)
            const active = currentMinutes >= start && currentMinutes < end
            const next = currentMinutes < start && !todaySlots.some((candidate) => {
              const candidateStart = toMinutes(candidate.startTime)
              return candidateStart > currentMinutes && candidateStart < start
            })
            const title = slot.slotKind === 'LESSON'
              ? assignment?.label ?? 'Lezione'
              : SPECIAL_LABELS[slot.slotKind as keyof typeof SPECIAL_LABELS] ?? 'Altro'

            return (
              <article className={`todayFocusItem ${active ? 'active' : next ? 'next' : ''}`} key={slot.id}>
                <span>{slot.startTime}–{slot.endTime}</span>
                <strong>{title}</strong>
                <small>{active ? 'In corso' : next ? 'Prossimo' : slot.slotKind === 'LESSON' ? 'Lezione' : 'Impegno'}</small>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="todayFocusEmpty">Nessuna attività inserita per {day.label.toLowerCase()}.</div>
      )}
    </section>
  )
}

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}
