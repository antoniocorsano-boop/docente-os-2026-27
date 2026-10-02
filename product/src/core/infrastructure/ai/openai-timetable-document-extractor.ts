// @trama-readonly — outbound extraction request does not mutate Docente OS state
import { normalizeTeacherLabel } from '@/core/domain/timetable-teacher-evidence'

type ResponsesPayload = {
  output_text?: string
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
}

export type TimetableDocumentExtractionRow = Readonly<{
  day: number
  ordinal: number
  classLabel: string
  sourceTeacherLabel: string
  confidence: number | null
  evidenceRef: string
}>

export type TimetableDocumentExtraction = Readonly<{
  rows: readonly TimetableDocumentExtractionRow[]
  processor: string
  processorVersion: string
}>

export class TimetableDocumentExtractionUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimetableDocumentExtractionUnavailableError'
  }
}

/**
 * Assisted document extraction only.
 *
 * The model identifies visible timetable cells. It never chooses a discipline,
 * a teaching assignment, a timetable target, or whether an import may be applied.
 * The teacher label is re-validated locally with the governed Unicode normalizer
 * before any row can become applicable.
 */
export class OpenAiTimetableDocumentExtractor {
  constructor(
    private readonly apiKey = process.env.OPENAI_TIMETABLE_API_KEY ?? process.env.OPENAI_API_KEY,
    private readonly model = process.env.OPENAI_VISION_MODEL ?? 'gpt-5.6',
  ) {}

  async extract(input: {
    bytes: Uint8Array
    mimeType: string
    filename: string
    teacherLabel: string
    knownClassLabels: readonly string[]
  }): Promise<TimetableDocumentExtraction> {
    if (!this.apiKey) {
      throw new TimetableDocumentExtractionUnavailableError(
        'OPENAI_TIMETABLE_API_KEY is required for timetable document extraction',
      )
    }
    if (input.mimeType !== 'application/pdf' && !input.mimeType.startsWith('image/')) {
      throw new TimetableDocumentExtractionUnavailableError('Unsupported timetable source type')
    }

    const normalizedTeacher = normalizeTeacherLabel(input.teacherLabel)
    if (!normalizedTeacher) {
      throw new TimetableDocumentExtractionUnavailableError('Teacher label is required')
    }

    const media = input.mimeType === 'application/pdf'
      ? {
          type: 'input_file',
          filename: input.filename,
          file_data: dataUrl(input.bytes, input.mimeType),
        }
      : {
          type: 'input_image',
          image_url: dataUrl(input.bytes, input.mimeType),
          detail: 'high',
        }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: [{
          role: 'user',
          content: [
            media,
            {
              type: 'input_text',
              text: extractionPrompt(input.teacherLabel, input.knownClassLabels),
            },
          ],
        }],
        text: {
          format: {
            type: 'json_schema',
            name: 'teacher_timetable_extraction',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['rows'],
              properties: {
                rows: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['day','ordinal','classLabel','sourceTeacherLabel','confidence','page'],
                    properties: {
                      day: { type: 'integer', minimum: 1, maximum: 6 },
                      ordinal: { type: 'integer', minimum: 1, maximum: 20 },
                      classLabel: { type: 'string' },
                      sourceTeacherLabel: { type: 'string' },
                      confidence: { type: ['number','null'], minimum: 0, maximum: 1 },
                      page: { type: 'integer', minimum: 1 },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const message = (await response.text()).slice(0, 500)
      throw new Error(`Timetable extraction failed (${response.status}): ${message}`)
    }

    const payload = await response.json() as ResponsesPayload
    const outputText = payload.output_text
      ?? payload.output?.flatMap((item) => item.content ?? [])
        .find((item) => item.type === 'output_text')?.text
    if (!outputText) throw new Error('Timetable extraction returned no structured output')

    const parsed = JSON.parse(outputText) as {
      rows?: Array<{
        day?: number
        ordinal?: number
        classLabel?: string
        sourceTeacherLabel?: string
        confidence?: number | null
        page?: number
      }>
    }

    const rows: TimetableDocumentExtractionRow[] = []
    const seen = new Set<string>()
    for (const row of parsed.rows ?? []) {
      if (
        !Number.isInteger(row.day)
        || !Number.isInteger(row.ordinal)
        || typeof row.classLabel !== 'string'
        || typeof row.sourceTeacherLabel !== 'string'
        || !Number.isInteger(row.page)
      ) {
        continue
      }

      let normalizedSourceTeacher: string
      try {
        normalizedSourceTeacher = normalizeTeacherLabel(row.sourceTeacherLabel)
      } catch {
        continue
      }
      if (normalizedSourceTeacher !== normalizedTeacher) continue

      const classLabel = row.classLabel.trim()
      if (!classLabel) continue
      const key = `${row.day}:${row.ordinal}:${classLabel.toUpperCase()}`
      if (seen.has(key)) continue
      seen.add(key)

      rows.push({
        day: row.day as number,
        ordinal: row.ordinal as number,
        classLabel,
        sourceTeacherLabel: row.sourceTeacherLabel.trim(),
        confidence:
          typeof row.confidence === 'number' && row.confidence >= 0 && row.confidence <= 1
            ? row.confidence
            : null,
        evidenceRef: `page:${row.page}`,
      })
    }

    rows.sort((a, b) =>
      a.day - b.day
      || a.ordinal - b.ordinal
      || a.classLabel.localeCompare(b.classLabel),
    )

    return {
      rows,
      processor: 'openai-responses-timetable-extraction',
      processorVersion: this.model,
    }
  }
}

function dataUrl(bytes: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`
}

function extractionPrompt(teacherLabel: string, knownClassLabels: readonly string[]) {
  const classScope = knownClassLabels.length
    ? `Le classi già note in Docente OS sono: ${knownClassLabels.join(', ')}. Se una cella corrisponde chiaramente a una di queste, usa quella forma canonica; altrimenti trascrivi la classe così come appare.`
    : 'Trascrivi la classe così come appare.'

  return [
    'Leggi questo documento come orario scolastico settimanale.',
    `Cerca esclusivamente le celle attribuite all'etichetta docente "${teacherLabel}".`,
    'Non usare somiglianze, iniziali inventate o inferenze sul docente: restituisci la cella solo quando nel documento è visibile l’etichetta richiesta.',
    'Per ogni cella restituisci: giorno della settimana come 1=lunedì ... 6=sabato, numero/posizione dell’ora, classe e testo docente esattamente come letto.',
    'Non dedurre mai la disciplina dal nome del docente.',
    'Non interpretare T, D, DIS o altre annotazioni come disciplina o tipo di lezione.',
    'Se una cella è illeggibile o ambigua, non completarla per supposizione.',
    classScope,
  ].join(' ')
}
