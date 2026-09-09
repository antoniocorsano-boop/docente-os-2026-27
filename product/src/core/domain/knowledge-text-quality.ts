export type KnowledgeWorkingTextQuality = {
  text: string
  removedBoilerplateLines: number
}

const LOCAL_PDF_TEXT_DERIVATIVE = /-anonimizzato\.txt$/i
const COPYRIGHT_LINE = /(?:(?:copyright\s*)?©|\bcopyright\b).*\b(?:19|20)\d{2}\b/i
const SUMMARY_NAVIGATION = /^(?:per scaricare i contenuti online|vai su|lezione|compiti|verifiche|orientamento|idee per insegnare)$/i
const STANDALONE_URL = /^www\.[^\s]+$/i

const BOILERPLATE_PATTERNS = [
  /^questa pagina è riservata a chi insegna\b/i,
  /^comunque messa a disposizione del pubblico\b/i,
  /^fini esclusivi di attività didattica\.?$/i,
  /^copia riservata all['’]insegnante\b/i,
  /^(?:prima|seconda|terza|quarta|quinta)?\s*edizione\b.*©.*\b(?:19|20)\d{2}\b/i,
  /^questo libro è stampato su carta\b/i,
  /^stampa:\s*\S+/i,
  /^per conto di .*\b(?:editore|edizioni)\b/i,
  /^\[dato di contatto rimosso\],?\s*\d{5}\b/i,
  /^diritti riservati\b/i,
  /^i diritti di (?:pubblicazione|riproduzione)\b/i,
]

export function isLocalPdfTextDerivativeFilename(value: string | null | undefined) {
  return Boolean(value?.trim() && LOCAL_PDF_TEXT_DERIVATIVE.test(value.trim()))
}

export function normalizeKnowledgeWorkingText(
  text: string,
  options: { localPdfTextDerivative?: boolean } = {},
): KnowledgeWorkingTextQuality {
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  if (!options.localPdfTextDerivative) {
    return { text: normalized, removedBoilerplateLines: 0 }
  }

  const lines = normalized.split('\n')
  const kept: string[] = []
  let removedBoilerplateLines = 0
  let legalBlockWindow = 0

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const compact = collapse(line)
    const nextCompact = collapse(lines[index + 1] ?? '')
    const isCopyrightLine = COPYRIGHT_LINE.test(compact)
    const isLegalContinuation = legalBlockWindow > 0 && isLegalBlockContinuation(compact)

    if (
      isCopyrightLine
      || isKnowledgeBoilerplateLine(compact)
      || isTeacherFormTemplateLine(compact)
      || looksLikeCreditLineBeforeCopyright(compact, nextCompact)
      || isLegalContinuation
    ) {
      removedBoilerplateLines += 1
      legalBlockWindow = isCopyrightLine ? 8 : Math.max(0, legalBlockWindow - 1)
      continue
    }

    if (legalBlockWindow > 0) legalBlockWindow -= 1
    kept.push(line.trimEnd())
  }

  return {
    text: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    removedBoilerplateLines,
  }
}

export function isKnowledgeBoilerplateLine(value: string) {
  const line = collapse(value)
  if (!line) return false
  if (/^\d{1,4}$/.test(line)) return true
  if (COPYRIGHT_LINE.test(line)) return true
  return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(line))
}

export function meaningfulKnowledgeSummary(text: string, maxLength = 320) {
  const lines = text
    .replace(/\r/g, '')
    .split(/\n+/)
    .map(collapse)
    .filter(Boolean)
    .filter((line) => !isKnowledgeBoilerplateLine(line))
    .filter((line) => !isTeacherFormTemplateLine(line))
    .filter((line) => !SUMMARY_NAVIGATION.test(line))

  if (!lines.length) return text.slice(0, maxLength).trim()

  const selected: string[] = []
  let currentLength = 0
  for (const line of lines) {
    const addition = selected.length ? line.length + 2 : line.length
    if (selected.length && currentLength + addition > maxLength) break
    selected.push(line)
    currentLength += addition
    if (selected.length >= 6 || currentLength >= Math.min(220, maxLength)) break
  }

  return selected.join(' · ').slice(0, maxLength).trim()
}

export function isKnowledgeHighlightNoise(value: string) {
  const line = collapse(value)
  if (!line) return true
  if (isKnowledgeBoilerplateLine(line) || isTeacherFormTemplateLine(line)) return true
  if (/^(?:nome|cognome|classe|data)\b/i.test(line) && /\.{4,}/.test(line)) return true
  return false
}

function isTeacherFormTemplateLine(line: string) {
  const normalized = line.toLocaleLowerCase('it-IT')
  const completeTemplate = ['nome', 'cognome', 'classe', 'data'].every((token) => normalized.includes(token))
    && /\.{4,}/.test(line)
  const standaloneEmptyField = /^(?:nome|cognome|classe|data)\s*[:._-]*$/i.test(line)
  return completeTemplate || standaloneEmptyField
}

function looksLikeCreditLineBeforeCopyright(line: string, nextLine: string) {
  if (!line || !COPYRIGHT_LINE.test(nextLine)) return false
  const commaCount = (line.match(/,/g) ?? []).length
  return commaCount >= 2 && line.length <= 180
}

function isLegalBlockContinuation(line: string) {
  if (!line) return false
  if (STANDALONE_URL.test(line)) return true
  if (/^diritti riservati\b/i.test(line)) return true
  if (/^i diritti di (?:pubblicazione|riproduzione)\b/i.test(line)) return true
  if (/^(?:noleggio|prestito|esecuzione)\b.*\b(?:distribuzione|comunicazione|traduzione|trascrizione)\b/i.test(line)) return true
  return false
}

function collapse(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}
