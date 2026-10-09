import type {
  TemplatePrivacyClass,
  TemplateQualityFinding,
  TemplateQualityReview,
  TemplateRenderRole,
  TemplateSection,
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

export type TemplateBuilderHistoryEntry = {
  versionNo: number
  current: boolean
  active: boolean
  reviewLabel: string
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
  history: TemplateBuilderHistoryEntry[]
  identityId: string | null
  currentVersionNo: number | null
  institutionName: string | null
}

export type GovernedFamilyTemplateViewModel = TemplateBuilderViewModel & {
  heading: 'Modello del documento'
  actions: TemplateBuilderLifecycleAction[]
  history: TemplateBuilderHistoryEntry[]
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
  institutionalBaseReview?: TemplateQualityReview | null
  familyTemplate: DocumentTemplateSnapshot | null
  familyTemplateReview?: TemplateQualityReview | null
  role: WorkspaceRole
}

type PersistedQualityReview = {
  id: string
  versionNo: number
  result: TemplateQualityReview['result']
  findings: TemplateQualityFinding[]
  reviewedAt: string
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
    canApprove: isReviewPass(review) && hasPendingVersion,
    sections: sectionViewModels(version.draft.sections),
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
      history: [],
      identityId: null,
      currentVersionNo: null,
      institutionName: null,
    }
  } else {
    const snapshot = input.institutionalBase
    const version = snapshot.versions.find((candidate) => candidate.versionNo === snapshot.base.currentVersionNo)
    if (!version) throw new Error('La veste istituzionale non contiene la versione corrente revisionabile.')

    const review = resolveReview(
      snapshot.qualityReviews,
      version.versionNo,
      input.institutionalBaseReview,
    )
    const canActivate = review !== null
      && isReviewPass(review)
      && snapshot.base.activeVersionNo !== version.versionNo

    institutionalBase = {
      heading: 'Veste istituzionale',
      title: snapshot.base.name,
      statusLabel: statusLabel(snapshot.base.status),
      sourceSummary: sourceSummary(snapshot.sources.length, 'veste'),
      reviewLabel: review ? reviewResultLabel(review.result) : 'Controllo non disponibile',
      findings: review?.findings.map((finding) => finding.summary) ?? [],
      actions: lifecycleActions(snapshot.base.status, canGovern, canActivate),
      history: buildHistory(
        snapshot.versions.map((candidate) => candidate.versionNo),
        snapshot.qualityReviews,
        snapshot.base.currentVersionNo,
        snapshot.base.activeVersionNo,
        input.institutionalBaseReview,
      ),
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
      history: [],
      identityId: null,
      currentVersionNo: null,
    }
  } else {
    const snapshot = input.familyTemplate
    const version = snapshot.versions.find(
      (candidate) => candidate.versionNo === snapshot.template.currentVersionNo,
    )
    if (!version) throw new Error('Il modello non contiene la versione corrente revisionabile.')

    const review = resolveReview(
      snapshot.qualityReviews,
      version.versionNo,
      input.familyTemplateReview,
    )
    const hasPendingVersion = snapshot.template.activeVersionNo === null
      || snapshot.template.activeVersionNo !== version.versionNo
    const canApprove = review !== null && isReviewPass(review) && hasPendingVersion

    familyTemplate = {
      heading: 'Modello del documento',
      title: snapshot.template.name,
      statusLabel: statusLabel(snapshot.template.status),
      sourceSummary: sourceSummary(snapshot.sources.length, 'modello'),
      reviewLabel: review ? reviewResultLabel(review.result) : 'Controllo non disponibile',
      findings: review?.findings.map((finding) => finding.summary) ?? [],
      canApprove,
      sections: sectionViewModels(version.draft.sections),
      actions: lifecycleActions(snapshot.template.status, canGovern, canApprove),
      history: buildHistory(
        snapshot.versions.map((candidate) => candidate.versionNo),
        snapshot.qualityReviews,
        snapshot.template.currentVersionNo,
        snapshot.template.activeVersionNo,
        input.familyTemplateReview,
      ),
      identityId: snapshot.template.id,
      currentVersionNo: snapshot.template.currentVersionNo,
    }
  }

  return { canGovern, institutionalBase, familyTemplate }
}

function resolveReview(
  persistedReviews: readonly PersistedQualityReview[],
  versionNo: number,
  fallback?: TemplateQualityReview | null,
): TemplateQualityReview | null {
  const persisted = [...persistedReviews]
    .filter((review) => review.versionNo === versionNo)
    .sort((left, right) => {
      const byTime = right.reviewedAt.localeCompare(left.reviewedAt)
      return byTime !== 0 ? byTime : right.id.localeCompare(left.id)
    })[0]

  if (persisted) {
    return {
      result: persisted.result,
      findings: persisted.findings,
      versionNo,
    }
  }

  if (fallback?.versionNo === versionNo) return fallback
  return null
}

function buildHistory(
  versionNumbers: number[],
  reviews: readonly PersistedQualityReview[],
  currentVersionNo: number,
  activeVersionNo: number | null,
  currentFallback?: TemplateQualityReview | null,
): TemplateBuilderHistoryEntry[] {
  return [...versionNumbers]
    .sort((left, right) => right - left)
    .map((versionNo) => {
      const review = resolveReview(
        reviews,
        versionNo,
        versionNo === currentVersionNo ? currentFallback : null,
      )
      return {
        versionNo,
        current: versionNo === currentVersionNo,
        active: versionNo === activeVersionNo,
        reviewLabel: review ? reviewResultLabel(review.result) : 'Controllo non disponibile',
      }
    })
}

function sectionViewModels(sections: TemplateSection[]): TemplateBuilderSectionViewModel[] {
  return sections.map((section, index, allSections) => ({
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
      ...(index < allSections.length - 1 ? ['Sposta dopo'] : []),
      'Accorpa con una sezione vicina',
      ...(section.required ? [] : ['Rimuovi dal modello']),
    ],
  }))
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
