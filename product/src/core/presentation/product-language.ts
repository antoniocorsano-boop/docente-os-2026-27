import type {
  KnowledgeAssetKind,
  KnowledgeContentCategory,
  KnowledgeContextStatus,
  KnowledgeDocumentType,
  KnowledgeGenerationStatus,
  KnowledgeProcessingStatus,
  KnowledgeReliability,
  KnowledgeSourceProvider,
  KnowledgeUnitType,
  KnowledgeValidationStatus,
} from '../domain/knowledge'

export type HumanStatusTone = 'ready' | 'info' | 'attention' | 'danger' | 'neutral'

export type HumanStatus = {
  label: string
  description: string
  tone: HumanStatusTone
}

export function knowledgeProcessingStatus(status: KnowledgeProcessingStatus): HumanStatus {
  switch (status) {
    case 'INDEXED':
      return { label: 'Pronto', description: 'Il contenuto è organizzato e può essere usato nel lavoro.', tone: 'ready' }
    case 'NORMALIZED':
      return { label: 'Organizzato', description: 'Il contenuto è stato letto; l’indice è in preparazione.', tone: 'info' }
    case 'CAPTURED':
      return { label: 'Acquisito', description: 'L’originale è conservato e attende l’elaborazione.', tone: 'neutral' }
    case 'FAILED':
      return { label: 'Da riprovare', description: 'L’elaborazione non è riuscita, ma l’originale resta conservato.', tone: 'danger' }
  }
}

export function sourceProviderLabel(provider: KnowledgeSourceProvider) {
  const labels: Record<KnowledgeSourceProvider, string> = {
    UPLOAD: 'File caricato',
    DRIVE: 'Google Drive',
    GMAIL: 'Gmail',
    CALENDAR: 'Google Calendar',
    MANUAL: 'Inserito da te',
    SYSTEM: 'DOCENTE OS',
  }
  return labels[provider]
}

export function assetKindLabel(kind: KnowledgeAssetKind) {
  const labels: Record<KnowledgeAssetKind, string> = {
    FILE: 'Documento',
    EMAIL: 'Email',
    EVENT: 'Evento',
    NOTE: 'Nota',
    WEB: 'Contenuto web',
    GENERATED: 'Creato in DOCENTE OS',
  }
  return labels[kind]
}

export function documentTypeLabel(type: KnowledgeDocumentType) {
  const labels: Record<KnowledgeDocumentType, string> = {
    CIRCULAR: 'Circolare',
    TEMPLATE: 'Modello',
    ATTESTATION: 'Attestazione',
    TEACHING: 'Contenuto didattico',
    COMMUNICATION: 'Comunicazione',
    GENERAL: 'Documento',
  }
  return labels[type]
}

export function contentCategoryLabel(category: KnowledgeContentCategory) {
  const labels: Record<KnowledgeContentCategory, string> = {
    CIRCULAR: 'Circolare',
    MODEL: 'Modello',
    PROGRAMMING: 'Programmazione',
    UDA: 'Unità di apprendimento',
    ASSESSMENT: 'Verifica o valutazione',
    TEACHING_RESOURCE: 'Risorsa didattica',
    COMMUNICATION: 'Comunicazione',
    OTHER: 'Altro',
  }
  return labels[category]
}

export function contextStatusLabel(status: KnowledgeContextStatus) {
  if (status === 'REVIEWED') return 'Controllato'
  if (status === 'NEEDS_REVIEW') return 'Da controllare'
  return 'Da classificare'
}

export function reliabilityLabel(reliability: KnowledgeReliability) {
  if (reliability === 'VERIFIED') return 'Verificata'
  if (reliability === 'TO_VERIFY') return 'Da verificare'
  return 'Automatica'
}

export function validationStatusLabel(status: KnowledgeValidationStatus) {
  if (status === 'REVIEWED') return 'Confermato'
  if (status === 'REJECTED') return 'Scartato'
  return 'Da verificare'
}

export function generationStatusLabel(status: KnowledgeGenerationStatus) {
  if (status === 'SUCCEEDED') return 'Completata'
  if (status === 'FAILED') return 'Da riprovare'
  return 'In aggiornamento'
}

export function unitTypeLabel(type: KnowledgeUnitType) {
  const labels: Record<KnowledgeUnitType, string> = {
    CHUNK: 'Contenuto',
    ENTITY: 'Riferimento',
    DATE: 'Data',
    DEADLINE: 'Scadenza',
    ACTION: 'Azione',
    PERSON: 'Persona',
    CLASS: 'Classe',
    TOPIC: 'Argomento',
    RULE: 'Regola',
  }
  return labels[type]
}

export function humanizeKnowledgeTitle(value: string | null | undefined) {
  if (!value?.trim()) return 'Contenuto senza titolo'

  const withoutExtension = value.trim().replace(/\.(pdf|docx|txt|md|png|jpe?g|webp)$/i, '')
  const normalized = withoutExtension.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim()
  const withoutCanonicalPrefix = normalized.replace(/^CAN-[A-Z]+-[A-Z0-9]+(?:\s*[-:]?\s*)?/i, '').trim()

  return withoutCanonicalPrefix || normalized
}

export const CONTENT_CATEGORIES: ReadonlyArray<readonly [KnowledgeContentCategory, string]> = [
  ['CIRCULAR', 'Circolare'],
  ['MODEL', 'Modello'],
  ['PROGRAMMING', 'Programmazione'],
  ['UDA', 'Unità di apprendimento'],
  ['ASSESSMENT', 'Verifica o valutazione'],
  ['TEACHING_RESOURCE', 'Risorsa didattica'],
  ['COMMUNICATION', 'Comunicazione'],
  ['OTHER', 'Altro'],
]
