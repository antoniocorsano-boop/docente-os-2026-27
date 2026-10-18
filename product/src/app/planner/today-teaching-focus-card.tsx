import Link from 'next/link'
import { ArrowUpRight, Clock3 } from 'lucide-react'
import type { TodayTeachingFocus } from '@/core/presentation/today-teaching-focus'

export function TodayTeachingFocusCard({ focus }: { focus: TodayTeachingFocus }) {
  return (
    <>
      <section className="todayTeachingFocus" aria-labelledby="today-teaching-focus-title">
        <div className="todayTeachingFocusTopline">
          <span className="todayTeachingState">{focus.stateLabel}</span>
          <span className="todayTeachingTime">
            <Clock3 size={15} aria-hidden />
            {focus.dateLabel
              ? `${focus.dateLabel} · ${timeLabel(focus.startAt)}`
              : focus.state === 'NEXT' && focus.minutesUntilStart !== null && focus.minutesUntilStart > 0
                ? `Tra ${focus.minutesUntilStart} min`
                : `${timeLabel(focus.startAt)}–${timeLabel(focus.endAt)}`}
          </span>
        </div>

        <div className="todayTeachingIdentity">
          {focus.classLabel ? <strong className="todayTeachingClassBadge">{focus.classLabel}</strong> : null}
          <span>{focus.subjectLabel ?? focus.occurrenceTitle}</span>
        </div>

        <h2 id="today-teaching-focus-title">{focus.lessonTitle}</h2>
        <p className="todayTeachingSchedule">
          {focus.dateLabel ? <><span>{focus.dateLabel}</span><span aria-hidden>·</span></> : null}
          <span>{timeLabel(focus.startAt)}–{timeLabel(focus.endAt)}</span>
          <span aria-hidden>·</span>
          <span>{focus.authorityLabel}</span>
        </p>

        {focus.chips.length ? (
          <div className="todayTeachingChips" aria-label="Contesto della lezione">
            {focus.chips.map((chip) => <span key={chip}>{chip}</span>)}
          </div>
        ) : null}

        {focus.authority === 'PROVISIONAL_DRAFT' ? (
          <p className="todayTeachingNotice">La collocazione deriva dall’orario provvisorio applicabile alla giornata.</p>
        ) : null}

        {focus.contextNotice ? <p className="todayTeachingNotice">{focus.contextNotice}</p> : null}

        {focus.action ? (
          <Link className="todayTeachingPrimaryAction" href={focus.action.href}>
            {focus.action.label}
            <ArrowUpRight size={18} aria-hidden />
          </Link>
        ) : null}
      </section>

      {focus.continuity ? (
        <Link className="todayContinuityCard" href={focus.continuity.href}>
          <span>{focus.continuity.label}</span>
          <strong>{focus.continuity.detail}</strong>
          <ArrowUpRight size={17} aria-hidden />
        </Link>
      ) : null}
    </>
  )
}

function timeLabel(value: string) {
  return value.slice(11, 16)
}
