import type { TemplatePrivacyClass, TemplateQualityReview, TemplateRenderRole, TemplateValuePolicy } from '../../../core/domain/document-template'
import type { DocumentTemplateSnapshot } from '../../../core/infrastructure/supabase/supabase-document-template-repository'

export type TemplateBuilderFieldViewModel = {
  label: string
  requiredLabel: string
  valuePolicyLabel: string
  privacyLabel: string
}

export type TemplateBuilderSectionViewModel = {
  label: string
  purpose: string
  renderRoleLabel: string
  requiredLabel: string
  fields: TemplateBuilderFieldViewModel[]
  availableDecisions: string[]
}

export type TemplateBuilderViewModel = {
  title: string
  statusLabel: string
  sourceSummary: string
  reviewLabel: string
  findings: string[]
  canApprove: boolean
  sections: TemplateBuilderSectionViewModel[]
}

export function buildTemplateBuilderViewModel(
  snapshot: DocumentTemplateSnapshot,
  review: TemplateQualityReview,
): TemplateBuilderViewModel {
  const version = snapshot.activeVersion
    ?? [...snapshot.versions].sort((left, right) => right.versionNo - left.versionNo)[0]
  if (!version) throw new Error('Il modello non contiene ancora una versione revisionabile.')

  return {
    title: snapshot.template.name,
    statusLabel: statusLabel(snapshot.template.status),
    sourceSummary: snapshot.sources.length
      ? `${snapshot.sources.length} ${snapshot.sources.length === 1 ? 'sorgente di riferimento' : 'sorgenti di riferimento'}`
      : 'Nuovo modello',
    reviewLabel: reviewResultLabel(review.result),
    findings: review.findings.map((finding) => finding.summary),
    canApprove: (review.result === 'PASS' || review.result === 'PASS_WITH_NOTES') && snapshot.template.status !== 'ACTIVE',
    sections: version.draft.sections.map((section, index, sections) => ({
      label: section.label,
      purpose: section.purpose,
      renderRoleLabel: renderRoleLabel(section.renderRole),
      requiredLabel: section.required ? 'Necessaria' : 'Solo quando pertinente',
      fields: section.fields.map((field) => ({
        label: field.label,
        requiredLabel: field.required ? 'Richiesta' : 'Facoltativa',
        valuePolicyLabel: valuePolicyLabel(field.valuePolicy),
        privacyLabel: privacyLabel(field.privacyClass),
      })),
      availableDecisions: [
        ...(index > 0 ? ['Sposta prima'] : []),
        ...(index < sections.length - 1 ? ['Sposta dopo'] : []),
        'Accorpa con una sezione vicina',
        ...(section.required ? [] : ['Rimuovi dal modello']),
      ],
    })),
  }
}

function statusLabel(status: DocumentTemplateSnapshot['template']['status']) {
  switch (status) {
    case 'DRAFT': return 'In preparazione'
    case 'QUALITY_REVIEWED': return 'Qualità verificata'
    case 'REVIEW_REQUIRED': return 'Da rivedere'
    case 'ACTIVE': return 'Modello in uso'
    case 'RETIRED': return 'Versione storica'
    case 'BLOCKED': return 'Non pubblicabile'
  }
}

function reviewResultLabel(result: TemplateQualityReview['result']) {
  switch (result) {
    case 'PASS': return 'Controllo qualità superato'
    case 'PASS_WITH_NOTES': return 'Controllo qualità superato con note'
    case 'REVIEW_REQUIRED': return 'Revisione necessaria'
    case 'BLOCKED': return 'Pubblicazione bloccata'
  }
}

function renderRoleLabel(role: TemplateRenderRole) {
  switch (role) {
    case 'HEADING': return 'Titolo'
    case 'PARAGRAPH': return 'Testo professionale'
    case 'KEY_VALUE': return 'Dati essenziali'
    case 'TABLE': return 'Tabella'
    case 'CHECKLIST': return 'Selezione guidata'
    case 'CALLOUT': return 'Riquadro in evidenza'
    case 'SIGNATURE_BLOCK': return 'Chiusura e firma'
  }
}

function valuePolicyLabel(policy: TemplateValuePolicy) {
  switch (policy) {
    case 'AUTO_DOCUMENTED': return 'Disponibile dai dati già registrati'
    case 'DERIVED': return 'Ricavata da dati documentati'
    case 'TEACHER_INPUT': return 'Da compilare dal docente'
    case 'TEACHER_CONFIRMATION': return 'Da controllare e confermare'
    case 'OPTIONAL_PROPOSAL': return 'Può essere proposta come supporto'
    case 'RESTRICTED': return 'Richiede una regola specifica'
    case 'STATIC': return 'Parte stabile del modello'
  }
}

function privacyLabel(value: TemplatePrivacyClass) {
  switch (value) {
    case 'PUBLIC_INSTITUTIONAL': return 'Informazione istituzionale'
    case 'PROFESSIONAL_CONTEXT': return 'Contesto professionale'
    case 'AGGREGATE_CLASS_DATA': return 'Dato aggregato della classe'
    case 'SENSITIVE_AGGREGATE': return 'Dato aggregato da valutare con cautela'
    case 'PERSONAL_STUDENT_DATA': return 'Dato personale non previsto nel documento di classe'
    case 'SPECIAL_CATEGORY_DATA': return 'Dato particolarmente protetto'
  }
}
