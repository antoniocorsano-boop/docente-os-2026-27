export type PrivacyRiskClass = 'D0' | 'D1' | 'D3' | 'D4' | 'D5'

export type PrivacyFinding = {
  code: string
  riskClass: PrivacyRiskClass
  label: string
}

export type PrivacyGuardResult = {
  allowed: boolean
  findings: PrivacyFinding[]
}

export type PrivacyContactSanitizationResult = {
  allowed: boolean
  sanitizedText: string
  removedLabels: string[]
  residualFindings: PrivacyFinding[]
}

const NAME_TOKEN = String.raw`[A-ZÀ-Ü][a-zà-ÿ'’-]+`
const FULL_NAME = String.raw`${NAME_TOKEN}(?:\s+${NAME_TOKEN})+`
const STUDENT_ROLE = String.raw`(?:[Aa]lunno|[Aa]lunna|[Ss]tudente|[Ss]tudentessa|[Rr]agazzo|[Rr]agazza)`
const NAMED_STUDENT = new RegExp(String.raw`(?:\b${STUDENT_ROLE}\s*[:\-]?\s*${FULL_NAME}|\b${FULL_NAME}\s*,?\s*${STUDENT_ROLE}\b)`, 'u')
const INDIVIDUAL_STUDENT_REFERENCE = /\b(?:alunno|alunna|studente|studentessa|ragazzo|ragazza)\s*(?:n(?:\.|umero)?\s*)?\d{1,4}\b/i

const DIRECT_IDENTIFIER_PATTERNS: Array<[string, RegExp, string]> = [
  ['EMAIL', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, 'indirizzo email'],
  ['ITALIAN_FISCAL_CODE', /\b[A-Z]{6}[0-9]{2}[A-EHLMPRST][0-9]{2}[A-Z][0-9]{3}[A-Z]\b/i, 'codice fiscale'],
  ['PHONE', /(?:\+39\s*(?:3\d{2}|0\d{1,3})[\s./-]*\d{5,8}\b|\b(?:tel(?:efono)?|cell(?:ulare)?)\s*[:\-]?\s*(?:\+39\s*)?(?:3\d{2}|0\d{1,3})[\s./-]*\d{5,8}\b)/i, 'numero di telefono'],
  ['DATE_OF_BIRTH', /\b(?:data\s+di\s+nascita|nato\s+il|nata\s+il)\b/i, 'dato di nascita'],
  ['ADDRESS', /\b(?:via|viale|piazza|corso|contrada|localit[aà])\s+[A-ZÀ-ÖØ-Ý][\p{L}'’.-]+(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}'’.-]+)*\s*,?\s*\d{1,4}\b/iu, 'indirizzo postale'],
  ['NAMED_STUDENT', NAMED_STUDENT, 'nominativo di studente'],
  ['INDIVIDUAL_STUDENT_REFERENCE', INDIVIDUAL_STUDENT_REFERENCE, 'riferimento individuale a studente'],
]

const AUTO_REDACTABLE_CONTACT_CODES = new Set(['EMAIL', 'PHONE', 'ADDRESS'])
const CONTACT_REDACTION_PLACEHOLDER = '[dato di contatto rimosso]'
const HIGH_RISK_CONTEXT = /\b(?:nota\s+disciplinare|sanzione\s+disciplinare|sospensione|madre|padre|genitore|famiglia|affidamento|tutore)\b/i
const SPECIAL_CATEGORY = /\b(?:diagnosi|patologia|certificato\s+medico|salute|terapia|farmaco|disabilit[aà]|legge\s*104|104\/92|DSA|BES|PDP|PEI|religione|confessione\s+religiosa)\b/i

export function inspectFreeTextForPilot(value: string): PrivacyGuardResult {
  const text = value.trim()
  if (!text) return { allowed: true, findings: [] }

  const findings: PrivacyFinding[] = []
  collect(findings, text, DIRECT_IDENTIFIER_PATTERNS, 'D3')

  for (const segment of privacySegments(text)) {
    if (!hasIdentifiedIndividual(segment)) continue
    if (HIGH_RISK_CONTEXT.test(segment)) {
      findings.push({ code: 'INDIVIDUAL_HIGH_RISK_CONTEXT', riskClass: 'D4', label: 'informazione personale individuale ad alto rischio' })
    }
    if (SPECIAL_CATEGORY.test(segment)) {
      findings.push({ code: 'INDIVIDUAL_SPECIAL_CATEGORY', riskClass: 'D5', label: 'informazione individuale potenzialmente appartenente a categoria particolare' })
    }
  }

  return { allowed: findings.length === 0, findings: dedupe(findings) }
}

export function sanitizeContactIdentifiersForPilot(value: string): PrivacyContactSanitizationResult {
  const initial = inspectFreeTextForPilot(value)
  if (initial.allowed) {
    return { allowed: true, sanitizedText: value, removedLabels: [], residualFindings: [] }
  }

  const initialCodes = new Set(initial.findings.map((finding) => finding.code))
  if ([...initialCodes].some((code) => !AUTO_REDACTABLE_CONTACT_CODES.has(code))) {
    return {
      allowed: false,
      sanitizedText: value,
      removedLabels: [],
      residualFindings: initial.findings,
    }
  }

  let sanitizedText = value
  const removedLabels: string[] = []
  for (const [code, pattern, label] of DIRECT_IDENTIFIER_PATTERNS) {
    if (!AUTO_REDACTABLE_CONTACT_CODES.has(code)) continue
    pattern.lastIndex = 0
    if (!pattern.test(sanitizedText)) continue
    removedLabels.push(label)
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
    sanitizedText = sanitizedText.replace(new RegExp(pattern.source, flags), CONTACT_REDACTION_PLACEHOLDER)
  }

  const residual = inspectFreeTextForPilot(sanitizedText)
  return {
    allowed: removedLabels.length > 0 && residual.allowed,
    sanitizedText,
    removedLabels: [...new Set(removedLabels)],
    residualFindings: residual.findings,
  }
}

export function inspectFilenameForPilot(filename: string): PrivacyGuardResult {
  const normalized = filename.replace(/[_.-]+/g, ' ')
  return inspectFreeTextForPilot(normalized)
}

export function pilotPrivacyErrorMessage(result: PrivacyGuardResult) {
  if (result.allowed) return null
  const labels = [...new Set(result.findings.map((finding) => finding.label))]
  return `Per il pilot anonimo rimuovi dati personali o sensibili: ${labels.join(', ')}.`
}

function privacySegments(text: string) {
  return text
    .split(/(?:\r?\n)+|;+\s*/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function hasIdentifiedIndividual(text: string) {
  for (const [, pattern] of DIRECT_IDENTIFIER_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(text)) return true
  }
  return false
}

function collect(
  target: PrivacyFinding[],
  text: string,
  patterns: Array<[string, RegExp, string]>,
  riskClass: PrivacyRiskClass,
) {
  for (const [code, pattern, label] of patterns) {
    pattern.lastIndex = 0
    if (pattern.test(text)) target.push({ code, riskClass, label })
  }
}

function dedupe(findings: PrivacyFinding[]) {
  return [...new Map(findings.map((finding) => [`${finding.riskClass}:${finding.code}`, finding])).values()]
}
