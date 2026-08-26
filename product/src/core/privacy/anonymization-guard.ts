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

const DIRECT_IDENTIFIER_PATTERNS: Array<[string, RegExp, string]> = [
  ['EMAIL', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, 'indirizzo email'],
  ['ITALIAN_FISCAL_CODE', /\b[A-Z]{6}[0-9]{2}[A-EHLMPRST][0-9]{2}[A-Z][0-9]{3}[A-Z]\b/i, 'codice fiscale'],
  ['PHONE', /(?:\+39\s*)?(?:3\d{2}|0\d{1,3})[\s./-]*\d{5,8}\b/, 'numero di telefono'],
  ['DATE_OF_BIRTH', /\b(?:data\s+di\s+nascita|nato\s+il|nata\s+il|nascita)\b/i, 'dato di nascita'],
  ['ADDRESS', /\b(?:via|viale|piazza|corso|contrada|localit[aà])\s+[A-ZÀ-ÖØ-Ý][\p{L}'’.-]+(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}'’.-]+)*\s*,?\s*\d{1,4}\b/iu, 'indirizzo postale'],
]

const HIGH_RISK_CONTEXT_PATTERNS: Array<[string, RegExp, string]> = [
  ['DISCIPLINARY', /\b(?:nota\s+disciplinare|sanzione\s+disciplinare|sospensione)\b/i, 'informazione disciplinare nominativa'],
  ['FAMILY_CONTEXT', /\b(?:madre|padre|genitore|famiglia|affidamento|tutore)\b/i, 'informazione familiare'],
]

const SPECIAL_CATEGORY_PATTERNS: Array<[string, RegExp, string]> = [
  ['HEALTH', /\b(?:diagnosi|patologia|certificato\s+medico|salute|terapia|farmaco)\b/i, 'dato sanitario'],
  ['DISABILITY', /\b(?:disabilit[aà]|legge\s*104|104\/92)\b/i, 'dato relativo a disabilità'],
  ['DSA_BES', /\b(?:DSA|BES|PDP|PEI)\b/i, 'dato educativo potenzialmente sensibile'],
  ['RELIGION', /\b(?:religione|confessione\s+religiosa)\b/i, 'convinzione religiosa'],
]

export function inspectFreeTextForPilot(value: string): PrivacyGuardResult {
  const text = value.trim()
  if (!text) return { allowed: true, findings: [] }

  const findings: PrivacyFinding[] = []
  collect(findings, text, DIRECT_IDENTIFIER_PATTERNS, 'D3')
  collect(findings, text, HIGH_RISK_CONTEXT_PATTERNS, 'D4')
  collect(findings, text, SPECIAL_CATEGORY_PATTERNS, 'D5')

  return { allowed: findings.length === 0, findings: dedupe(findings) }
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
