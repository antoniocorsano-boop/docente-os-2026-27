import {
  validateDocumentTemplate,
  validateInstitutionalBase,
  type DocumentTemplateVersionDraft,
  type InstitutionalBaseVersionDraft,
  type TemplateQualityFinding,
  type TemplateQualityReview,
} from '../domain/document-template'

const TECHNICAL_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  ['CAN_CODE', /\bCAN-[A-Z0-9-]+\b/i],
  ['BXX_CODE', /\bB(?:0[1-9]|[12][0-9]|3[0-3])\b/],
  ['UUID', /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i],
  [
    'SOFTWARE_ENTITY',
    /\b(?:TeachingSession|KnowledgeAsset|authored_documents?|document_templates?|document_template_versions?|document_template_quality_reviews?|document_template_lifecycle_decisions?|institutional_bases?|institutional_base_versions?|institutional_base_quality_reviews?|institutional_base_lifecycle_decisions?)\b/i,
  ],
  [
    'INTERNAL_STATE',
    /\b(?:DRAFT|QUALITY_REVIEWED|REVIEW_REQUIRED|ACTIVE|RETIRED|BLOCKED|PASS_WITH_NOTES|PASS|AUTO_DOCUMENTED|DERIVED|TEACHER_INPUT|TEACHER_CONFIRMATION|OPTIONAL_PROPOSAL|RESTRICTED|STATIC|PUBLIC_INSTITUTIONAL|PROFESSIONAL_CONTEXT|AGGREGATE_CLASS_DATA|SENSITIVE_AGGREGATE|PERSONAL_STUDENT_DATA|SPECIAL_CATEGORY_DATA|TEACHER_CONFIRMED|TO_VERIFY|MIXED)\b/,
  ],
  ['HASH', /\b[0-9a-f]{40,64}\b/i],
  ['DRIVE_PATH', /(?:drive:\/\/|\/Google Drive\/|https:\/\/drive\.google\.com\/)/i],
  ['AI_PROVIDER', /\b(?:OpenAI|GPT-[0-9.]+|Claude|Gemini|DeepSeek|Groq|Hugging\s*Face)\b/i],
  ['AUTO_GENERATED_WORDING', /\bgenerat[oa]\s+automaticamente\b/i],
]

export function findForbiddenTechnicalReferences(text: string): string[] {
  return TECHNICAL_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([code]) => code)
}

function blockedStructuralReview(versionNo: number, codes: string[], subject: string): TemplateQualityReview {
  return {
    result: 'BLOCKED',
    findings: codes.map((code): TemplateQualityFinding => ({
      code,
      severity: 'BLOCKER',
      category: 'STRUCTURE',
      summary: `${subject} non valida: ${code}`,
    })),
    versionNo,
  }
}

function appendExternalPurityFindings(findings: TemplateQualityFinding[], text: string): void {
  for (const code of findForbiddenTechnicalReferences(text)) {
    findings.push({
      code: `EXTERNAL_${code}`,
      severity: 'BLOCKER',
      category: 'EXTERNAL_PURITY',
      summary: `Il testo professionale contiene un riferimento tecnico vietato (${code}).`,
    })
  }
}

export function reviewInstitutionalBase(draft: InstitutionalBaseVersionDraft): TemplateQualityReview {
  const validation = validateInstitutionalBase(draft)
  if (!validation.valid) {
    return blockedStructuralReview(draft.version, validation.codes, 'Base istituzionale')
  }

  const findings: TemplateQualityFinding[] = []
  const professionalText = [
    draft.identityProfile.institutionName,
    ...draft.headerProfile.lines,
    ...draft.footerProfile.lines,
    draft.signatureProfile.label,
  ].join('\n')
  appendExternalPurityFindings(findings, professionalText)

  if (findings.length) return { result: 'BLOCKED', findings, versionNo: draft.version }
  return { result: 'PASS', findings: [], versionNo: draft.version }
}

export function reviewDocumentTemplate(draft: DocumentTemplateVersionDraft): TemplateQualityReview {
  const validation = validateDocumentTemplate(draft)
  if (!validation.valid) {
    return blockedStructuralReview(draft.version, validation.codes, 'Struttura del template')
  }

  const findings: TemplateQualityFinding[] = []
  for (const section of draft.sections) {
    for (const field of section.fields) {
      if (
        field.required
        && (
          field.privacyClass === 'SENSITIVE_AGGREGATE'
          || field.privacyClass === 'PERSONAL_STUDENT_DATA'
          || field.privacyClass === 'SPECIAL_CATEGORY_DATA'
        )
      ) {
        findings.push({
          code: 'REQUIRED_SENSITIVE_FIELD',
          severity: 'MAJOR',
          category: 'PRIVACY',
          sectionKey: section.key,
          summary: `Il campo obbligatorio “${field.label}” richiede una decisione esplicita di minimizzazione.`,
        })
      }
      if (field.required && field.valuePolicy === 'RESTRICTED') {
        findings.push({
          code: 'REQUIRED_RESTRICTED_FIELD',
          severity: 'MAJOR',
          category: 'PRIVACY',
          sectionKey: section.key,
          summary: `Il campo obbligatorio “${field.label}” è soggetto a policy dedicata.`,
        })
      }
    }
  }

  const externalText = [
    draft.name,
    ...draft.sections.flatMap((section) => [
      section.label,
      section.purpose,
      ...section.fields.flatMap((field) => [
        field.label,
        field.helpText ?? '',
        ...(field.options ?? []).map((option) => option.label),
      ]),
    ]),
  ].join('\n')
  appendExternalPurityFindings(findings, externalText)

  if (findings.some((finding) => finding.severity === 'BLOCKER')) {
    return { result: 'BLOCKED', findings, versionNo: draft.version }
  }
  if (findings.some((finding) => finding.severity === 'MAJOR')) {
    return { result: 'REVIEW_REQUIRED', findings, versionNo: draft.version }
  }
  if (findings.length) return { result: 'PASS_WITH_NOTES', findings, versionNo: draft.version }
  return { result: 'PASS', findings: [], versionNo: draft.version }
}
