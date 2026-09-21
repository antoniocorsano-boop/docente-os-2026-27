import type { KnowledgeEnrichmentPort } from '@/core/application/ports/knowledge-base'
import type { KnowledgeContentCategory, KnowledgeDocumentType, NormalizedKnowledge } from '@/core/domain/knowledge'
import { profileSchoolDocument } from './school-document-profile'

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

const teachingCategories = new Set<KnowledgeContentCategory>([
  'ASSESSMENT',
  'TEACHING_RESOURCE',
  'PROGRAMMING',
  'UDA',
  'CURRICULUM',
])

export class SchoolCommunicationEnrichment implements KnowledgeEnrichmentPort {
  async enrich(input: NormalizedKnowledge): Promise<NormalizedKnowledge> {
    const text = input.text?.trim()
    if (!text) return input

    const schoolDocumentProfile = profileSchoolDocument({ title: input.title, text })
    const documentType = inferDocumentType(text, input.title, input.documentType, schoolDocumentProfile.suggestedCategory)
    const semanticMode = inferSemanticMode(documentType, schoolDocumentProfile.suggestedCategory)
    const semanticUnits: NormalizedKnowledge['units'] = []
    const seen = new Set<string>()

    if (semanticMode === 'OPERATIONAL_COMMUNICATION') {
      const calendarCandidates = extractCalendarEventCandidates(text, input.title)
      const calendarDates = new Set(calendarCandidates.map((candidate) => candidate.date))

      for (const candidate of calendarCandidates) {
        semanticUnits.push({
          type: 'DEADLINE',
          title: candidate.title,
          content: candidate.evidence,
          structuredData: {
            date: candidate.date,
            dueAt: `${candidate.date}T${candidate.startTime}:00+02:00`,
            matchedText: candidate.matchedText,
            calendarEvent: candidate,
            extractionRule: 'school-communication-calendar-v1',
          },
          confidence: candidate.confidence,
        })
        seen.add(`CALENDAR:${candidate.date}:${candidate.startTime}:${candidate.endTime}`)
      }

      for (const sentence of splitSentences(text)) {
        const dates = extractItalianDates(sentence, inferDocumentYear(text))

        for (const date of dates) {
          if (calendarDates.has(date.iso)) continue
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
                extractionRule: 'school-communication-v2',
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
                extractionRule: 'school-communication-v2',
              },
              confidence: actionConfidence(sentence, Boolean(due)),
            })
            seen.add(key)
          }
        }
      }
    }

    for (const flag of schoolDocumentProfile.qualityFlags) {
      const observation = qualityObservation(flag)
      if (observation) semanticUnits.push(observation)
    }

    return {
      ...input,
      title: semanticTitle(input.title, text),
      documentType,
      extractedData: {
        ...(input.extractedData ?? {}),
        enrichment: 'school-communication-v3',
        semanticMode,
        candidateCount: semanticUnits.filter((unit) => unit.type === 'ACTION' || unit.type === 'DEADLINE').length,
        schoolDocumentProfile,
      },
      units: [...input.units, ...semanticUnits],
      processor: `${input.processor}+school-communication`,
      processorVersion: `${input.processorVersion}+3.0.0`,
    }
  }
}

function qualityObservation(flag: string): NormalizedKnowledge['units'][number] | null {
  if (flag === 'INSTITUTION_NAME_CANONICALIZATION_REQUIRED') {
    return {
      type: 'RULE',
      title: 'Denominazione dell’Istituto da verificare',
      content: 'Il documento usa “Lorenzo Milani” senza “don”. Verificare la denominazione istituzionale prima dell’uso ufficiale.',
      structuredData: {
        qualityFlag: flag,
        expectedForm: 'Istituto Comprensivo Statale “don Lorenzo Milani” — Calvario–Covotta',
        requiresHumanReview: true,
        extractionRule: 'school-document-profile-v1',
      },
      confidence: 0.99,
    }
  }
  return null
}

function inferDocumentType(
  text: string,
  title: string | null | undefined,
  current: KnowledgeDocumentType,
  category: KnowledgeContentCategory,
): KnowledgeDocumentType {
  if (teachingCategories.has(category)) return 'TEACHING'
  if (/\bcircolare\b/i.test(`${title ?? ''}\n${text}`)) return 'CIRCULAR'
  const hits = communicationPatterns.filter((pattern) => pattern.test(text)).length
  return hits >= 2 ? 'COMMUNICATION' : current
}

function inferSemanticMode(documentType: KnowledgeDocumentType, category: KnowledgeContentCategory) {
  if (teachingCategories.has(category) || documentType === 'TEACHING') return 'TEACHING_CONTENT' as const
  if (documentType === 'CIRCULAR' || documentType === 'COMMUNICATION') return 'OPERATIONAL_COMMUNICATION' as const
  return 'GENERAL_CONTENT' as const
}

function semanticTitle(current: string | null | undefined, text: string) {
  const title = current?.trim() ?? ''
  if (title && !isTechnicalDerivativeTitle(title)) return title

  const heading = text
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((value) => value.trim().replace(/\s+/g, ' '))
    .find((value) => value.length >= 3 && value.length <= 180)

  return heading || title || 'Documento'
}

function isTechnicalDerivativeTitle(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,8}$/i, '')
    .replace(/[_\s]+/g, '-')
  return /^(?:documento|scansione)(?:-semantico)?-anonim[oa]$/.test(normalized) || normalized === 'asset'
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

type CalendarEventCandidate = {
  title: string
  date: string
  startTime: string
  endTime: string
  eventKind: 'INSTITUTION' | 'MEETING' | 'TRAINING' | 'OTHER'
  location: string | null
  mandatory: boolean
  attendanceMode: 'IN_PERSON' | 'REMOTE' | 'UNSPECIFIED'
  evidence: string
  matchedText: string
  confidence: number
}

function extractCalendarEventCandidates(text: string, currentTitle: string | null | undefined): CalendarEventCandidate[] {
  const fallbackYear = inferDocumentYear(text)
  const title = calendarEventTitle(text, currentTitle)
  const result: CalendarEventCandidate[] = []
  const seen = new Set<string>()

  for (const sentence of splitSentences(text)) {
    const time = extractTimeRange(sentence)
    if (!time) continue
    const date = extractItalianDates(sentence, fallbackYear)[0]
    if (!date) continue

    const key = `${date.iso}:${time.startTime}:${time.endTime}`
    if (seen.has(key)) continue
    seen.add(key)

    result.push({
      title,
      date: date.iso,
      startTime: time.startTime,
      endTime: time.endTime,
      eventKind: inferCalendarEventKind(text),
      location: extractLocation(sentence),
      mandatory: /\b(obbligatori[aoe]?|sono convocat[ei]|è obbligatoria|e obbligatoria)\b/i.test(text),
      attendanceMode: /\bin presenza\b/i.test(sentence)
        ? 'IN_PERSON'
        : /\b(?:online|a distanza|videoconferenza|da remoto)\b/i.test(sentence)
          ? 'REMOTE'
          : 'UNSPECIFIED',
      evidence: sentence,
      matchedText: `${date.matchedText}; ${time.matchedText}`,
      confidence: 0.98,
    })
  }

  return result
}

function inferDocumentYear(text: string) {
  return text.match(/\b(20\d{2})\b/)?.[1] ?? null
}

function extractTimeRange(sentence: string) {
  const match = sentence.match(/\bdalle\s+ore\s+(\d{1,2})[.:](\d{2})\s+alle\s+ore\s+(\d{1,2})[.:](\d{2})\b/i)
    ?? sentence.match(/\bdalle\s+(\d{1,2})[.:](\d{2})\s+alle\s+(\d{1,2})[.:](\d{2})\b/i)
  if (!match) return null
  const startTime = `${pad(match[1])}:${match[2]}`
  const endTime = `${pad(match[3])}:${match[4]}`
  if (startTime >= endTime || !validTime(startTime) || !validTime(endTime)) return null
  return { startTime, endTime, matchedText: match[0] }
}

function validTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function extractLocation(sentence: string) {
  const match = sentence.match(/\bpresso\s+(?:il\s+|la\s+)?([^,.;\n]+?)(?=,\s*(?:lunedi|lunedì|martedi|martedì|mercoledi|mercoledì|giovedi|giovedì|venerdi|venerdì|sabato|domenica|\d)|\s+dalle\s+ore|[.;])/i)
  return match?.[1]?.replace(/\s+/g, ' ').trim() || null
}

function inferCalendarEventKind(text: string): CalendarEventCandidate['eventKind'] {
  if (/\b(formazione|corso|aggiornamento)\b/i.test(text)) return 'TRAINING'
  if (/\b(riunione|collegio|consiglio|assemblea|incontro)\b/i.test(text)) return 'MEETING'
  if (/\b(istituto|personale|docenti|ata)\b/i.test(text)) return 'INSTITUTION'
  return 'OTHER'
}

function calendarEventTitle(text: string, currentTitle: string | null | undefined) {
  const subject = text.match(/\bOGGETTO\s*:\s*([\s\S]{1,320}?)(?=\n\s*(?:Si|Le)\s)/i)?.[1]
    ?.replace(/\s+/g, ' ')
    .replace(/[–-]\s*\d{1,2}\s+[a-zàèéìòù]+\s+20\d{2}\.?$/i, '')
    .replace(/\.$/, '')
    .trim()
  const fallback = currentTitle?.replace(/\.[a-z0-9]{1,8}$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return (subject || fallback || 'Impegno da circolare').slice(0, 200)
}

function extractItalianDates(sentence: string, fallbackYear: string | null = null): ExtractedDate[] {
  const result: ExtractedDate[] = []
  const numeric = /\b(0?[1-9]|[12]\d|3[01])[\/.\-](0?[1-9]|1[0-2])[\/.\-](20\d{2})\b/g
  for (const match of sentence.matchAll(numeric)) {
    result.push({ iso: `${match[3]}-${pad(match[2])}-${pad(match[1])}`, matchedText: match[0], confidence: 0.98 })
  }

  const months: Record<string, string> = {
    gennaio: '01', febbraio: '02', marzo: '03', aprile: '04', maggio: '05', giugno: '06',
    luglio: '07', agosto: '08', settembre: '09', ottobre: '10', novembre: '11', dicembre: '12',
  }
  const named = /\b(0?[1-9]|[12]\d|3[01])\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(20\d{2}))?\b/gi
  for (const match of sentence.matchAll(named)) {
    const year = match[3] || fallbackYear
    if (!year) continue
    result.push({ iso: `${year}-${months[match[2].toLowerCase()]}-${pad(match[1])}`, matchedText: match[0], confidence: match[3] ? 0.99 : 0.94 })
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
