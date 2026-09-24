import {
  BookOpen,
  CalendarDays,
  Cloud,
  FileUp,
  Globe2,
  Mail,
  PenLine,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { LessonDesignExtensionSourceKind } from '@/core/domain/lesson-design-extension'
import type { KnowledgeSourceProvider } from '@/core/domain/knowledge'
import { DocenteOsMark } from '@/components/brand/docente-os-brand'
import { knowledgeSourceProvenanceDefinition, sourceProvenanceDefinition } from './source-provenance-registry'
import styles from './source-provenance.module.css'

const ICONS: Record<NonNullable<ReturnType<typeof sourceProvenanceDefinition>['icon']>, LucideIcon> = {
  BOOK_OPEN: BookOpen,
  PEN_LINE: PenLine,
  GLOBE_2: Globe2,
  SPARKLES: Sparkles,
  FILE_UP: FileUp,
  MAIL: Mail,
  CALENDAR_DAYS: CalendarDays,
  CLOUD: Cloud,
}

type SourceProvenanceProps = (
  | { kind: LessonDesignExtensionSourceKind; provider?: never }
  | { provider: KnowledgeSourceProvider; kind?: never }
) & {
  className?: string
}

export function SourceProvenance({
  kind,
  provider,
  className,
}: SourceProvenanceProps) {
  const definition = kind
    ? sourceProvenanceDefinition(kind)
    : knowledgeSourceProvenanceDefinition(provider)
  const sourceKey = kind ?? `KNOWLEDGE_PROVIDER:${provider}`

  return (
    <span
      className={[styles.root, className].filter(Boolean).join(' ')}
      aria-label={definition.accessibleLabel}
      data-source-kind={sourceKey}
    >
      <span className={styles.mark} aria-hidden="true">
        {definition.mark === 'ATLAS' ? (
          <span className={styles.atlasMark}>✦</span>
        ) : definition.mark === 'DOCENTE_OS' ? (
          <DocenteOsMark size={16} variant="monochrome" className={styles.docenteOsMark} />
        ) : definition.icon ? (
          <LucideSourceIcon icon={definition.icon} />
        ) : null}
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

