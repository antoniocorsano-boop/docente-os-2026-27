export type DocumentTemplateKind =
  | 'FINAL_REPORT'
  | 'PROGRAM_CARRIED_OUT'
  | 'ANNUAL_PROGRAMMING'
  | 'UDA_INSTITUTIONAL'

export type DocumentTemplateStatus =
  | 'DRAFT'
  | 'QUALITY_REVIEWED'
  | 'REVIEW_REQUIRED'
  | 'ACTIVE'
  | 'RETIRED'
  | 'BLOCKED'

export type TemplateRenderRole =
  | 'HEADING'
  | 'PARAGRAPH'
  | 'KEY_VALUE'
  | 'TABLE'
  | 'CHECKLIST'
  | 'CALLOUT'
  | 'SIGNATURE_BLOCK'

export type TemplateFieldType =
  | 'TEXT_SHORT'
  | 'TEXT_LONG'
  | 'NUMBER'
  | 'DATE'
  | 'BOOLEAN'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'CHECKLIST'
  | 'TABLE'
  | 'REPEATING_GROUP'
  | 'DERIVED_VALUE'
  | 'DERIVED_TEXT'
  | 'STATIC_TEXT'
  | 'IMAGE'
  | 'SIGNATURE'

export type TemplateValuePolicy =
  | 'AUTO_DOCUMENTED'
  | 'DERIVED'
  | 'TEACHER_INPUT'
  | 'TEACHER_CONFIRMATION'
  | 'OPTIONAL_PROPOSAL'
  | 'RESTRICTED'
  | 'STATIC'

export type TemplatePrivacyClass =
  | 'PUBLIC_INSTITUTIONAL'
  | 'PROFESSIONAL_CONTEXT'
  | 'AGGREGATE_CLASS_DATA'
  | 'SENSITIVE_AGGREGATE'
  | 'PERSONAL_STUDENT_DATA'
  | 'SPECIAL_CATEGORY_DATA'

export type TemplateCardinality = 'ONE' | 'MANY'

export type TemplateOption = {
  value: string
  label: string
}

export type TemplateField = {
  key: string
  label: string
  type: TemplateFieldType
  required: boolean
  cardinality: TemplateCardinality
  valuePolicy: TemplateValuePolicy
  privacyClass: TemplatePrivacyClass
  validationRule?: string | null
  sourcePolicy?: string | null
  helpText?: string | null
  options?: TemplateOption[]
}

export type TemplateSection = {
  key: string
  label: string
  purpose: string
  required: boolean
  repeatable: boolean
  renderRole: TemplateRenderRole
  visibilityRule?: string | null
  fields: TemplateField[]
}

export type DocumentTemplateVersionDraft = {
  kind: DocumentTemplateKind
  name: string
  version: number
  sourceRevisionRefs: string[]
  sections: TemplateSection[]
}

export type CreateInstitutionalBaseInput = {
  name: string
}

export type InstitutionalIdentityProfile = {
  institutionName: string
  logoAssetRef: string | null
}

export type InstitutionalHeaderProfile = {
  lines: string[]
}

export type InstitutionalFooterProfile = {
  lines: string[]
}

export type InstitutionalTypographyProfile = {
  bodyFontFamily: string
  headingFontFamily: string
  baseFontSizePt: number
  lineHeight: number
}

export type InstitutionalPageGeometryProfile = {
  format: 'A4'
  orientation: 'PORTRAIT' | 'LANDSCAPE'
  marginTopMm: number
  marginRightMm: number
  marginBottomMm: number
  marginLeftMm: number
}

export type InstitutionalCommonTableProfile = {
  headerWeight: 'NORMAL' | 'BOLD'
  cellPaddingMm: number
  repeatHeader: boolean
}

export type InstitutionalSignatureProfile = {
  showLocation: boolean
  showDate: boolean
  label: string
}

export type InstitutionalAccessibilityProfile = {
  minimumFontSizePt: number
  highContrast: boolean
  tableHeadersRequired: boolean
}

export type InstitutionalBaseVersionDraft = {
  version: number
  identityProfile: InstitutionalIdentityProfile
  headerProfile: InstitutionalHeaderProfile
  footerProfile: InstitutionalFooterProfile
  typographyProfile: InstitutionalTypographyProfile
  pageGeometryProfile: InstitutionalPageGeometryProfile
  commonTableProfile: InstitutionalCommonTableProfile
  signatureProfile: InstitutionalSignatureProfile
  accessibilityProfile: InstitutionalAccessibilityProfile
  sourceRevisionRefs: string[]
}

export type InstitutionalRenderPin = {
  institutionalBaseId: string
  institutionalBaseVersionNo: number
  familyTemplateId: string
  familyTemplateVersionNo: number
}

export type TemplateValidation = {
  valid: boolean
  codes: string[]
}

export type TemplateQualityResult = 'PASS' | 'PASS_WITH_NOTES' | 'REVIEW_REQUIRED' | 'BLOCKED'

export type TemplateQualityFinding = {
  code: string
  severity: 'INFO' | 'MINOR' | 'MAJOR' | 'BLOCKER'
  category: string
  sectionKey?: string
  summary: string
}

export type TemplateQualityReview = {
  result: TemplateQualityResult
  findings: TemplateQualityFinding[]
  versionNo?: number
}

export function validateDocumentTemplate(draft: DocumentTemplateVersionDraft): TemplateValidation {
  const codes: string[] = []
  if (!draft.name.trim()) codes.push('TEMPLATE_NAME_REQUIRED')
  if (!Number.isInteger(draft.version) || draft.version < 1) codes.push('INVALID_TEMPLATE_VERSION')
  if (!draft.sections.length) codes.push('TEMPLATE_SECTIONS_REQUIRED')

  const sectionKeys = new Set<string>()
  const fieldKeys = new Set<string>()
  for (const section of draft.sections) {
    const sectionKey = section.key.trim()
    if (!sectionKey) codes.push('SECTION_KEY_REQUIRED')
    if (sectionKey && sectionKeys.has(sectionKey)) codes.push('DUPLICATE_SECTION_KEY')
    if (sectionKey) sectionKeys.add(sectionKey)
    if (!section.label.trim()) codes.push('SECTION_LABEL_REQUIRED')
    if (!section.purpose.trim()) codes.push('SECTION_PURPOSE_REQUIRED')

    for (const field of section.fields) {
      const fieldKey = field.key.trim()
      if (!fieldKey) codes.push('FIELD_KEY_REQUIRED')
      if (fieldKey && fieldKeys.has(fieldKey)) codes.push('DUPLICATE_FIELD_KEY')
      if (fieldKey) fieldKeys.add(fieldKey)
      if (!field.label.trim()) codes.push('FIELD_LABEL_REQUIRED')
    }
  }

  const uniqueCodes = [...new Set(codes)]
  return { valid: uniqueCodes.length === 0, codes: uniqueCodes }
}

const FORBIDDEN_LAYOUT_KEYS = new Set(['css', 'html', 'rawcss', 'rawhtml', 'style', 'classname', 'script', 'jsx'])

function hasForbiddenLayoutPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some(hasForbiddenLayoutPayload)

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_LAYOUT_KEYS.has(key.toLowerCase())) return true
    if (hasForbiddenLayoutPayload(child)) return true
  }
  return false
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function hasOnlyNonBlankLines(lines: string[]): boolean {
  return lines.every((line) => typeof line === 'string' && line.trim().length > 0)
}

export function validateInstitutionalBase(draft: InstitutionalBaseVersionDraft): TemplateValidation {
  const codes: string[] = []

  if (!Number.isInteger(draft.version) || draft.version < 1) codes.push('INVALID_INSTITUTIONAL_BASE_VERSION')
  if (!draft.identityProfile.institutionName.trim()) codes.push('INSTITUTION_NAME_REQUIRED')
  if (!hasOnlyNonBlankLines(draft.headerProfile.lines)) codes.push('INVALID_HEADER_PROFILE')
  if (!hasOnlyNonBlankLines(draft.footerProfile.lines)) codes.push('INVALID_FOOTER_PROFILE')
  if (!draft.typographyProfile.bodyFontFamily.trim() || !draft.typographyProfile.headingFontFamily.trim()) {
    codes.push('FONT_FAMILY_REQUIRED')
  }
  if (!isPositiveFinite(draft.typographyProfile.baseFontSizePt)) codes.push('INVALID_BASE_FONT_SIZE')
  if (!isPositiveFinite(draft.typographyProfile.lineHeight)) codes.push('INVALID_LINE_HEIGHT')
  if (!isPositiveFinite(draft.pageGeometryProfile.marginTopMm)) codes.push('INVALID_PAGE_GEOMETRY')
  if (!isPositiveFinite(draft.pageGeometryProfile.marginRightMm)) codes.push('INVALID_PAGE_GEOMETRY')
  if (!isPositiveFinite(draft.pageGeometryProfile.marginBottomMm)) codes.push('INVALID_PAGE_GEOMETRY')
  if (!isPositiveFinite(draft.pageGeometryProfile.marginLeftMm)) codes.push('INVALID_PAGE_GEOMETRY')
  if (!isPositiveFinite(draft.commonTableProfile.cellPaddingMm)) codes.push('INVALID_TABLE_PROFILE')
  if (!draft.signatureProfile.label.trim()) codes.push('SIGNATURE_LABEL_REQUIRED')
  if (!isPositiveFinite(draft.accessibilityProfile.minimumFontSizePt)) codes.push('INVALID_ACCESSIBILITY_PROFILE')
  if (hasForbiddenLayoutPayload(draft)) codes.push('ARBITRARY_LAYOUT_PAYLOAD_FORBIDDEN')

  const uniqueCodes = [...new Set(codes)]
  return { valid: uniqueCodes.length === 0, codes: uniqueCodes }
}
