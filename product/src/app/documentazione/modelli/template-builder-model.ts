import type {
  TemplatePrivacyClass,
  TemplateQualityReview,
  TemplateRenderRole,
  TemplateValuePolicy,
} from '../../../core/domain/document-template'
import type { WorkspaceRole } from '../../../core/domain/workspace'
import type { DocumentTemplateSnapshot } from '../../../core/infrastructure/supabase/supabase-document-template-repository'
import type { InstitutionalBaseSnapshot } from '../../../core/infrastructure/supabase/supabase-institutional-base-repository'

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

export type TemplateBuilderLifecycleActionKey = 'ACTIVATE' | 'BLOCK' | 'CLEAR_BLOCK' | 'RETIRE'

export type TemplateBuilderLifecycleAction = {
  key: TemplateBuilderLifecycleActionKey
  label: string
}

export type GovernedInstitutionalBaseViewModel = {
  heading: 'Veste istituzionale'
  title: string
  statusLabel: string
  sourceSummary: string
  reviewLabel: string
  findings: string[]
  actions: TemplateBuilderLifecycleAction[]
  identityId: string | null
  currentVersionNo: number | null
  institutionName: string | null
}

export type GovernedFamilyTemplateViewModel = TemplateBuilderViewModel & {
  heading: 'Modello del documento'
  actions: TemplateBuilderLifecycleAction[]
  identityId: string | null
  currentVersionNo: number | null
}

export type GovernedTemplateBuilderViewModel = {
  canGovern: boolean
  institutionalBase: GovernedInstitutionalBaseViewModel
  familyTemplate: GovernedFamilyTemplateViewModel
}

export type BuildGovernedTemplateBuilderInput = {
  institutionalBase: InstitutionalBaseSnapshot | null
  institutionalBaseReview: TemplateQualityReview | null
  familyTemplate: DocumentTemplateSnapshot | null
  familyTemplateReview: TemplateQualityReview | null
  role: WorkspaceRole
}

export function buildTemplateBuilderViewModel(
  snapshot: DocumentTemplateSnapshot,
  review: TemplateQualityReview,
): TemplateBuilderViewModel {
  const version = snapshot.versions.find(
    (candidate) => candidate.versionNo === snapshot.template.currentVersionNo,
  )
  if (!version) throw new Error('Il modello non contiene la versione corrente revisionabile.')
  if (review.versionNo !== version.versionNo) {
    throw new Error('La review non corrisponde alla versione corrente del modello.')
  }

  const hasPendingVersion = snapshot.template.activeVersionNo === null
    || snapshot.template.activeVersionNo !== version.versionNo

  return {
    title: snapshot.template.name,
    statusLabel: statusLabel(snapshot.template.status),
    sourceSummary: sourceSummary(snapshot.sources.length, 'modello'),
    reviewLabel: reviewResultLabel(review.result),
    findings: review.findings.map((finding) => finding.summary),
    canApprove: (review.result === 'PASS' || review.result === 'PASS_WITH_NOTES') && hasPendingVersion,
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

export function buildGovernedTemplateBuilderViewModel(
  input: BuildGovernedTemplateBuilderInput,
): GovernedTemplateBuilderViewModel {
  const canGovern = input.role === 'OWNER' || input.role === 'ADMIN'

  let institutionalBase: GovernedInstitutionalBaseViewModel
  if (!input.institutionalBase) {
    institutionalBase = {
      heading: 'Veste istituzionale',
      title: 'Nessuna veste istituzionale registrata',
      statusLabel: 'Non disponibile',
      sourceSummary: 'Nessuna sorgente registrata',
      reviewLabel: 'Controllo non disponibile',
      findings: [],
      actions: [],
      identityId: null,
      currentVersionNo: null,
      institutionName: null,
    }
  } else {
    const snapshot = input.institutionalBase
    const version = snapshot.versions.find((candidate) => candidate.versionNo === snapshot.base.currentVersionNo)
    if (!version) throw new Error('La veste istituzionale non contiene la versione corrente revisionabile.')
    if (!input.institutionalBaseReview || input.institutionalBaseReview.versionNo !== version.versionNo) {
      throw new Error('La review non corrisponde alla versione corrente della veste istituzionale.')
    }
    const review = input.institutionalBaseReview
    const canActivate = isReviewPass(review)
      && snapshot.base.activeVersionNo !== version.versionNo

    institutionalBase = {
      heading: 'Veste istituzionale',
      title: snapshot.base.name,
      statusLabel: statusLabel(snapshot.base.status),
      sourceSummary: sourceSummary(snapshot.sources.length, 'veste'),
      reviewLabel: reviewResultLabel(review.result),
      findings: review.findings.map((finding) => finding.summary),
      actions: lifecycleActions(snapshot.base.status, canGovern, canActivate),
      identityId: snapshot.base.id,
      currentVersionNo: version.versionNo,
      institutionName: version.draft.identityProfile.institutionName,
    }
  }

  let familyTemplate: GovernedFamilyTemplateViewModel
  if (!input.familyTemplate) {
    familyTemplate = {
      heading: 'Modello del documento',
      title: 'Nessun modello documentale registrato',
      statusLabel: 'Non disponibile',
      sourceSummary: 'Nessuna sorgente registrata',
      reviewLabel: 'Controllo non disponibile',
      findings: [],
      canApprove: false,
      sections: [],
      actions: [],
      identityId: null,
      currentVersionNo: null,
    }
  } else {
    if (!input.familyTemplateReview) {
      throw new Error('Il modello documentale non contiene una review della versione corrente.')
    }
    const base = buildTemplateBuilderViewModel(input.familyTemplate, input.familyTemplateReview)
    familyTemplate = {
      ...base,
      heading: 'Modello del documento',
      actions: lifecycleActions(
        input.familyTemplate.template.status,
        canGovern,
        base.canApprove,
      ),
      identityId: input.familyTemplate.template.id,
      currentVersionNo: input.familyTemplate.template.currentVersionNo,
    }
  }

  return { canGovern, institutionalBase, familyTemplate }
}

function lifecycleActions(
  status: DocumentTemplateSnapshot['template']['status'] | InstitutionalBaseSnapshot['base']['status'],
  canGovern: boolean,
  canActivate: boolean,
): TemplateBuilderLifecycleAction[] {
  if (!canGovern || status === 'RETIRED') return []
  if (status === 'BLOCKED') {
    return [
      { key: 'CLEAR_BLOCK', label: 'Rimuovi blocco' },
      { key: 'RETIRE', label: 'Ritira' },
    ]
  }

  return [
    ...(canActivate ? [{ key: 'ACTIVATE' as const, label: 'Attiva' }] : []),
    { key: 'BLOCK', label: 'Blocca' },
    { key: 'RETIRE', label: 'Ritira' },
  ]
}

function isReviewPass(review: TemplateQualityReview) {
  return review.result === 'PASS' || review.result === 'PASS_WITH_NOTES'
}

function sourceSummary(count: number, subject: 'modello' | 'veste') {
  if (!count) return subject === 'modello' ? 'Nuovo modello' : 'Nuova veste'
  return `${count} ${count === 1 ? 'sorgente di riferimento' : 'sorgenti di riferimento'}`
}

function statusLabel(status: DocumentTemplateSnapshot['template']['status'] | InstitutionalBaseSnapshot['base']['status']) {
  switch (status) {
    case 'DRAFT': return 'In preparazione'
    case 'QUALITY_REVIEWED': return 'Qualità verificata'
    case 'REVIEW_REQUIRED': return 'Da rivedere'
    case 'ACTIVE': return 'In uso'
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
