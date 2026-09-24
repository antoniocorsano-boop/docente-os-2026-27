import type { LessonDesignExtensionSourceKind } from '@/core/domain/lesson-design-extension'
import type { KnowledgeSourceProvider } from '@/core/domain/knowledge'
import type { PlannerTaskSourceKind } from '@/core/domain/planner-task'

export type SourceProvenanceDefinition = {
  label: string
  accessibleLabel: string
  mark: 'ATLAS' | 'DOCENTE_OS' | 'LUCIDE'
  icon?: 'BOOK_OPEN' | 'PEN_LINE' | 'GLOBE_2' | 'SPARKLES' | 'FILE_UP' | 'MAIL' | 'CALENDAR_DAYS' | 'CLOUD' | 'FILE_TEXT' | 'MESSAGE_SQUARE'
}

const DEFINITIONS: Record<LessonDesignExtensionSourceKind, SourceProvenanceDefinition> = {
  ATLAS: {
    label: 'Atlas',
    accessibleLabel: 'Provenienza: Atlas',
    mark: 'ATLAS',
  },
  KNOWLEDGE: {
    label: 'Conoscenza',
    accessibleLabel: 'Provenienza: Conoscenza di Docente OS',
    mark: 'DOCENTE_OS',
  },
  EDITORIAL_KNOWLEDGE: {
    label: 'Dal libro',
    accessibleLabel: 'Provenienza: libro confermato per la classe',
    mark: 'LUCIDE',
    icon: 'BOOK_OPEN',
  },
  TEACHER: {
    label: 'Docente',
    accessibleLabel: 'Provenienza: inserito dal docente',
    mark: 'LUCIDE',
    icon: 'PEN_LINE',
  },
  WEB: {
    label: 'Web',
    accessibleLabel: 'Provenienza: fonte web',
    mark: 'LUCIDE',
    icon: 'GLOBE_2',
  },
  AI_TOOL: {
    label: 'Strumento assistito',
    accessibleLabel: 'Provenienza: strumento assistito',
    mark: 'LUCIDE',
    icon: 'SPARKLES',
  },
}

export function sourceProvenanceDefinition(kind: LessonDesignExtensionSourceKind): SourceProvenanceDefinition {
  return DEFINITIONS[kind]
}


const KNOWLEDGE_PROVIDER_DEFINITIONS: Record<KnowledgeSourceProvider, SourceProvenanceDefinition> = {
  UPLOAD: {
    label: 'File acquisito',
    accessibleLabel: 'Provenienza: file acquisito',
    mark: 'LUCIDE',
    icon: 'FILE_UP',
  },
  DRIVE: {
    label: 'Google Drive',
    accessibleLabel: 'Provenienza: Google Drive',
    mark: 'LUCIDE',
    icon: 'CLOUD',
  },
  GMAIL: {
    label: 'Gmail',
    accessibleLabel: 'Provenienza: Gmail',
    mark: 'LUCIDE',
    icon: 'MAIL',
  },
  CALENDAR: {
    label: 'Google Calendar',
    accessibleLabel: 'Provenienza: Google Calendar',
    mark: 'LUCIDE',
    icon: 'CALENDAR_DAYS',
  },
  MANUAL: {
    label: 'Inserito da te',
    accessibleLabel: 'Provenienza: inserito dal docente',
    mark: 'LUCIDE',
    icon: 'PEN_LINE',
  },
  SYSTEM: {
    label: 'Docente OS',
    accessibleLabel: 'Provenienza: Docente OS',
    mark: 'DOCENTE_OS',
  },
}

export function knowledgeSourceProvenanceDefinition(provider: KnowledgeSourceProvider): SourceProvenanceDefinition {
  return KNOWLEDGE_PROVIDER_DEFINITIONS[provider]
}


const PLANNER_SOURCE_DEFINITIONS: Record<PlannerTaskSourceKind, SourceProvenanceDefinition> = {
  MANUAL: {
    label: 'Inserita da te',
    accessibleLabel: 'Provenienza: inserita dal docente',
    mark: 'LUCIDE',
    icon: 'PEN_LINE',
  },
  COMMUNICATION: {
    label: 'Comunicazione',
    accessibleLabel: 'Provenienza: comunicazione',
    mark: 'LUCIDE',
    icon: 'MESSAGE_SQUARE',
  },
  CALENDAR: {
    label: 'Calendario',
    accessibleLabel: 'Provenienza: calendario',
    mark: 'LUCIDE',
    icon: 'CALENDAR_DAYS',
  },
  TEACHING: {
    label: 'Didattica',
    accessibleLabel: 'Provenienza: didattica',
    mark: 'LUCIDE',
    icon: 'BOOK_OPEN',
  },
  DOCUMENT: {
    label: 'Documento',
    accessibleLabel: 'Provenienza: documento',
    mark: 'LUCIDE',
    icon: 'FILE_TEXT',
  },
  SYSTEM: {
    label: 'Docente OS',
    accessibleLabel: 'Provenienza: Docente OS',
    mark: 'DOCENTE_OS',
  },
}

export function plannerSourceProvenanceDefinition(kind: PlannerTaskSourceKind): SourceProvenanceDefinition {
  return PLANNER_SOURCE_DEFINITIONS[kind]
}
