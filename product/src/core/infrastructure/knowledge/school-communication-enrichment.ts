import type { KnowledgeEnrichmentPort } from '@/core/application/ports/knowledge-base'
import type { NormalizedKnowledge } from '@/core/domain/knowledge'

const actionPatterns = [
  /\b(si invitano|si invita|è necessario|e necessario|dovranno|dovrà|dovra|devono|deve)\b/i,
  /\b(compilare|consegnare|inviare|presentare|partecipare|trasmettere|firmare|restituire|comunicare|prendere servizio)\b/i,
]

const communicationPatterns = [
  /\bcircolare\b/i,
  /\bcomunicazione\b/i,
  /\bdocenti\b/i,
  /\bpersonale\b/i,
  /\bistituto\b/i,
]

export class SchoolCommunicationEnrichment implements KnowledgeEnrichmentPort {
  async enrich(input: NormalizedKnowledge): Promise<NormalizedKnowledge> {
    const text = input.text?.trim()
    if (!text) return input

    const documentType = inferDocumentType(text, input.documentType)
    const semanticUnits: NormalizedKnowledge['units'] = []
    const seen = new Set<string>()

    for (const sentence of splitSentences(text)) {
      const dates = extractItalianDates(sentence)

      for (const date of dates) {
        const key = `DEADLINE:${date.iso}:${sentence}`
        if (!seen.has(key)) {
          semanticUnits.push({
            type: 'DEADLINE',
            title: `Data ${formatItalianIso(date.iso)}`,
            content: sentence,
            structuredData: {
              date: date.iso,
              dueAt: `${date.iso}T23:59:00+02:00`,
              matchedText: date.matchedText,
            },
            confidence: date.confidence,
          })
          seen.add(key)
        }
      }

      if (isActionSentence(sentence)) {
        const due = dates[0]
        const key = `ACTION:${sentence}`
        if (!seen.has(key)) {
          semanticUnits.push({
            type: 'ACTION',
            title: actionTitle(sentence),
            content: sentence,
            structuredData: {
              ...(due ? { dueDate: due.iso, dueAt: `${due.iso}T23:59:00+02:00` } : {}),
              extractionRule: 'school-communication-v1',
            },
            confidence: actionConfidence(sentence, Boolean(due)),
          })
          seen.add(key)
        }
      }
    }

    return {
      ...input,
      documentType,
      extractedData: {
        ...(input.extractedData ?? {}),
        enrichment: 'school-communication-v1',
        candidateCount: semanticUnits.length,
      },
      units: [...input.units, ...semanticUnits],
      processor: `${input.processor}+school-communication`,
      processorVersion: `${input.processorVersion}+1.0.0`,
    }
  }
}

function inferDocumentType(text: string, current: NormalizedKnowledge['documentType']) {
  if (/\bcircolare\b/i.test(text)) return 'CIRCULAR' as const
  const hits = communicationPatterns.filter((pattern) => pattern.test(text)).length
  return hits >= 2 ? 'COMMUNICATION' as const : current
}

function isActionSentence(sentence: string) {
  return actionPatterns.some((pattern) => pattern.test(sentence))
}

function actionConfidence(sentence: string, hasDate: boolean) {
  const strong = actionPatterns.filter((pattern) => pattern.test(sentence)).length
  return Math.min(0.98, 0.68 + strong * 0.1 + (hasDate ? 0.1 : 0))
}

function actionTitle(sentence: string) {
  const clean = sentence.replace(/\s+/g, ' ').trim()
  return clean.length <= 110 ? clean : `${clean.slice(0, 107)}…`
}

function splitSentences(text: string) {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 8)
}

type ExtractedDate = { iso: string; matchedText: string; confidence: number }

function extractItalianDates(sentence: string): ExtractedDate[] {
  const result: ExtractedDate[] = []
  const numeric = /\b(0?[1-9]|[12]\d|3[01])[\/.\-](0?[1-9]|1[0-2])[\/.\-](20\d{2})\b/g
  for (const match of sentence.matchAll(numeric)) {
    result.push({ iso: `${match[3]}-${pad(match[2])}-${pad(match[1])}`, matchedText: match[0], confidence: 0.98 })
  }

  const months: Record<string, string> = {
    gennaio: '01', febbraio: '02', marzo: '03', aprile: '04', maggio: '05', giugno: '06',
    luglio: '07', agosto: '08', settembre: '09', ottobre: '10', novembre: '11', dicembre: '12',
  }
  const named = /\b(0?[1-9]|[12]\d|3[01])\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(20\d{2})\b/gi
  for (const match of sentence.matchAll(named)) {
    result.push({ iso: `${match[3]}-${months[match[2].toLowerCase()]}-${pad(match[1])}`, matchedText: match[0], confidence: 0.99 })
  }

  return dedupeDates(result)
}

function dedupeDates(values: ExtractedDate[]) {
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = `${value.iso}:${value.matchedText}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function pad(value: string) {
  return value.padStart(2, '0')
}

function formatItalianIso(iso: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${iso}T12:00:00Z`))
}
