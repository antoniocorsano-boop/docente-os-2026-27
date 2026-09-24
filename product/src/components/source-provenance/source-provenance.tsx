import {
  BookOpen,
  CalendarDays,
  Cloud,
  FileText,
  FileUp,
  Globe2,
  Mail,
  MessageSquare,
  PenLine,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { LessonDesignExtensionSourceKind } from '@/core/domain/lesson-design-extension'
import type { KnowledgeSourceProvider } from '@/core/domain/knowledge'
import type { PlannerTaskSourceKind } from '@/core/domain/planner-task'
import { DocenteOsMark } from '@/components/brand/docente-os-brand'
import { knowledgeSourceProvenanceDefinition, plannerSourceProvenanceDefinition, sourceProvenanceDefinition } from './source-provenance-registry'
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
  FILE_TEXT: FileText,
  MESSAGE_SQUARE: MessageSquare,
}

type SourceProvenanceProps = (
  | { kind: LessonDesignExtensionSourceKind; provider?: never; plannerSource?: never }
  | { provider: KnowledgeSourceProvider; kind?: never; plannerSource?: never }
  | { plannerSource: PlannerTaskSourceKind; kind?: never; provider?: never }
) & {
  className?: string
}

export function SourceProvenance({
  kind,
  provider,
  plannerSource,
  className,
}: SourceProvenanceProps) {
  const definition = kind
    ? sourceProvenanceDefinition(kind)
    : provider
      ? knowledgeSourceProvenanceDefinition(provider)
      : plannerSourceProvenanceDefinition(plannerSource)
  const sourceKey = kind ?? (provider ? `KNOWLEDGE_PROVIDER:${provider}` : `PLANNER_SOURCE:${plannerSource}`)

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

