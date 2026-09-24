import type { LessonDesignExtensionSourceKind } from '@/core/domain/lesson-design-extension'

export type SourceProvenanceDefinition = {
  label: string
  accessibleLabel: string
  mark: 'ATLAS' | 'DOCENTE_OS' | 'LUCIDE'
  icon?: 'BOOK_OPEN' | 'PEN_LINE' | 'GLOBE_2' | 'SPARKLES'
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
