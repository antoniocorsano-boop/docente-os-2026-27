import { type CSSProperties, useId } from 'react'
import { cn } from '@/lib/utils'
import { DOCENTE_OS_MARK_COLORS, DOCENTE_OS_MARK_GEOMETRY } from './brand-mark-geometry'

export type BrandMarkVariant = 'light' | 'dark' | 'reduced'

export type BrandMarkProps = {
  size?: number
  className?: string
  title?: string
  variant?: BrandMarkVariant
}

export function DocenteOsMark({ size = 42, className, title, variant = 'light' }: BrandMarkProps) {
  const style = { '--dos-mark-size': `${size}px` } as CSSProperties
  const id = useId().replaceAll(':', '')
  const bodyGradientId = `dos-mark-body-${id}`
  const threadGradientId = `dos-mark-thread-${id}`
  const colors = markColors(variant)

  return (
    <svg
      className={cn('dosLogoMark', className)}
      style={style}
      viewBox={DOCENTE_OS_MARK_GEOMETRY.viewBox}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      data-brand-variant={variant}
    >
      <defs>
        <linearGradient id={bodyGradientId} x1="18" y1="14" x2="51" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={colors.bodyStart} />
          <stop offset="0.58" stopColor={colors.bodyMiddle} />
          <stop offset="1" stopColor={colors.bodyEnd} />
        </linearGradient>
        <linearGradient id={threadGradientId} x1="13" y1="49" x2="41" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={colors.threadStart} />
          <stop offset="1" stopColor={colors.threadEnd} />
        </linearGradient>
      </defs>

      <path
        className="dosLogoFrame"
        d={DOCENTE_OS_MARK_GEOMETRY.loopPath}
        fill="none"
        strokeWidth={DOCENTE_OS_MARK_GEOMETRY.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: `url(#${bodyGradientId})` }}
      />
      <path
        className="dosLogoStem"
        d={DOCENTE_OS_MARK_GEOMETRY.stemPath}
        fill="none"
        strokeWidth={DOCENTE_OS_MARK_GEOMETRY.strokeWidth}
        strokeLinecap="butt"
        style={{ stroke: `url(#${bodyGradientId})` }}
      />
      <path
        className="dosLogoThread"
        d={DOCENTE_OS_MARK_GEOMETRY.threadPath}
        fill="none"
        strokeWidth={DOCENTE_OS_MARK_GEOMETRY.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ stroke: `url(#${threadGradientId})` }}
      />
      <circle
        className="dosLogoDot"
        cx={DOCENTE_OS_MARK_GEOMETRY.dot.cx}
        cy={DOCENTE_OS_MARK_GEOMETRY.dot.cy}
        r={DOCENTE_OS_MARK_GEOMETRY.dot.r}
        style={{ fill: colors.dot }}
      />
    </svg>
  )
}

export function DocenteOsLockup({
  compact = false,
  inverse = false,
  academicYearLabel,
  className,
}: {
  compact?: boolean
  inverse?: boolean
  academicYearLabel?: string | null
  className?: string
}) {
  return (
    <span className={cn('dosLogoLockup', compact && 'compact', inverse && 'inverse', className)}>
      <DocenteOsMark size={compact ? 34 : 46} variant={inverse ? 'reduced' : 'light'} />
      <span className="dosLogoWords">
        <strong>Docente OS</strong>
        <small>{academicYearLabel ?? 'Mantieni il filo.'}</small>
      </span>
    </span>
  )
}

function markColors(variant: BrandMarkVariant) {
  if (variant === 'reduced') {
    return {
      bodyStart: DOCENTE_OS_MARK_COLORS.white,
      bodyMiddle: DOCENTE_OS_MARK_COLORS.white,
      bodyEnd: DOCENTE_OS_MARK_COLORS.inverseSoft,
      threadStart: DOCENTE_OS_MARK_COLORS.teal,
      threadEnd: DOCENTE_OS_MARK_COLORS.reducedThreadEnd,
      dot: DOCENTE_OS_MARK_COLORS.white,
    }
  }

  if (variant === 'dark') {
    return {
      bodyStart: DOCENTE_OS_MARK_COLORS.blue,
      bodyMiddle: DOCENTE_OS_MARK_COLORS.teal,
      bodyEnd: DOCENTE_OS_MARK_COLORS.navy,
      threadStart: DOCENTE_OS_MARK_COLORS.darkThreadStart,
      threadEnd: DOCENTE_OS_MARK_COLORS.darkThreadEnd,
      dot: DOCENTE_OS_MARK_COLORS.white,
    }
  }

  return {
    bodyStart: DOCENTE_OS_MARK_COLORS.blue,
    bodyMiddle: DOCENTE_OS_MARK_COLORS.blue,
    bodyEnd: DOCENTE_OS_MARK_COLORS.blueDeep,
    threadStart: DOCENTE_OS_MARK_COLORS.lightThreadStart,
    threadEnd: DOCENTE_OS_MARK_COLORS.teal,
    dot: DOCENTE_OS_MARK_COLORS.blue,
  }
}
