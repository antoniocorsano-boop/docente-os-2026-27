import {
  BookOpen,
  Globe2,
  PenLine,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { LessonDesignExtensionSourceKind } from '@/core/domain/lesson-design-extension'
import { sourceProvenanceDefinition } from './source-provenance-registry'
import styles from './source-provenance.module.css'

const ICONS: Record<NonNullable<ReturnType<typeof sourceProvenanceDefinition>['icon']>, LucideIcon> = {
  BOOK_OPEN: BookOpen,
  PEN_LINE: PenLine,
  GLOBE_2: Globe2,
  SPARKLES: Sparkles,
}

export function SourceProvenance({
  kind,
  className,
}: {
  kind: LessonDesignExtensionSourceKind
  className?: string
}) {
  const definition = sourceProvenanceDefinition(kind)

  return (
    <span
      className={[styles.root, className].filter(Boolean).join(' ')}
      aria-label={definition.accessibleLabel}
      data-source-kind={kind}
    >
      <span className={styles.mark} aria-hidden="true">
        {definition.mark === 'ATLAS' ? (
          <span className={styles.atlasMark}>✦</span>
        ) : definition.mark === 'DOCENTE_OS' ? (
          <DocenteOsMark />
        ) : (
          <LucideSourceIcon icon={definition.icon} />
        )}
      </span>
      <span>{definition.label}</span>
    </span>
  )
}

function LucideSourceIcon({
  icon,
}: {
  icon: NonNullable<ReturnType<typeof sourceProvenanceDefinition>['icon']>
}) {
  const Icon = ICONS[icon]
  return <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
}

function DocenteOsMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      className={styles.docenteOsMark}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M18 14H32.5C44.6 14 52 21.4 52 32.1C52 43.4 44.2 50 33 50C27.6 50 22.8 48.3 19 45.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 14V35.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="butt"
      />
      <path
        d="M13 49L27.4 34.6C28.8 33.2 30.2 32.5 31.9 32.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="31.5" cy="31.2" r="5.1" fill="currentColor" />
    </svg>
  )
}
