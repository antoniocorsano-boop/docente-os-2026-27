import { type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export type BrandMarkProps = {
  size?: number
  className?: string
  title?: string
}

export function DocenteOsMark({ size = 42, className, title }: BrandMarkProps) {
  const style = { '--dos-mark-size': `${size}px` } as CSSProperties
  return (
    <svg
      className={cn('dosLogoMark', className)}
      style={style}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <path className="dosLogoFrame" d="M15 10h18c12 0 21 9.4 21 22S45 54 33 54H20" />
      <path className="dosLogoStem" d="M15 10v27" />
      <circle className="dosLogoDot" cx="31.5" cy="31.5" r="5.2" />
      <path className="dosLogoThread" d="M10.5 51.5c7.8-10 16.1-15.5 26.8-15.5" />
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
      <DocenteOsMark size={compact ? 34 : 46} />
      <span className="dosLogoWords">
        <strong>Docente OS</strong>
        <small>{academicYearLabel ?? 'Mantieni il filo.'}</small>
      </span>
    </span>
  )
}
