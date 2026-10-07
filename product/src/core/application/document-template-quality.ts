import {
  validateDocumentTemplate,
  type DocumentTemplateVersionDraft,
  type TemplateQualityFinding,
  type TemplateQualityReview,
} from '../domain/document-template'

const TECHNICAL_PATTERNS: ReadonlyArray<[string, RegExp]> = [
  ['CAN_CODE', /\bCAN-[A-Z0-9-]+\b/i],
  ['BXX_CODE', /\bB(?:0[1-9]|[12][0-9]|3[0-3])\b/],
  ['UUID', /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i],
  ['SOFTWARE_ENTITY', /\b(?:TeachingSession|KnowledgeAsset|authored_documents?|document_template_versions?)\b/i],
  ['INTERNAL_STATE', /\b(?:AUTO_DOCUMENTED|TEACHER_CONFIRMED|OPTIONAL_PROPOSAL|RESTRICTED|TO_VERIFY|MIXED)\b/],
  ['HASH', /\b[0-9a-f]{40,64}\b/i],
  ['DRIVE_PATH', /(?:drive:\/\/|\/Google Drive\/|https:\/\/drive\.google\.com\/)/i],
  ['AI_PROVIDER', /\b(?:OpenAI|GPT-[0-9.]+|Claude|Gemini|DeepSeek|Groq|Hugging\s*Face)\b/i],
  ['AUTO_GENERATED_WORDING', /\bgenerat[oa]\s+automaticamente\b/i],
]

export function findForbiddenTechnicalReferences(text: string): string[] {
  return TECHNICAL_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([code]) => code)
}

export function reviewDocumentTemplate(draft: DocumentTemplateVersionDraft): TemplateQualityReview {
  const validation = validateDocumentTemplate(draft)
  if (!validation.valid) {
    return {
      result: 'BLOCKED',
      findings: validation.codes.map((code): TemplateQualityFinding => ({
        code,
        severity: 'BLOCKER',
        category: 'STRUCTURE',
        summary: `Struttura del template non valida: ${code}`,
      })),
    }
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
  const technicalCodes = findForbiddenTechnicalReferences(externalText)
  for (const code of technicalCodes) {
    findings.push({
      code: `EXTERNAL_${code}`,
      severity: 'BLOCKER',
      category: 'EXTERNAL_PURITY',
      summary: `Il testo professionale contiene un riferimento tecnico vietato (${code}).`,
    })
  }

  if (findings.some((finding) => finding.severity === 'BLOCKER')) return { result: 'BLOCKED', findings }
  if (findings.some((finding) => finding.severity === 'MAJOR')) return { result: 'REVIEW_REQUIRED', findings }
  if (findings.length) return { result: 'PASS_WITH_NOTES', findings }
  return { result: 'PASS', findings: [] }
}
