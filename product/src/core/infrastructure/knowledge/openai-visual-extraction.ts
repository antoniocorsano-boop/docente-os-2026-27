import { VisualExtractionUnavailableError } from '@/core/application/ports/knowledge-base'
import type { VisualExtractionPort, VisualExtractionPage } from '@/core/application/ports/knowledge-base'

type ResponsesPayload = {
  output_text?: string
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
}

export class OpenAiVisualExtraction implements VisualExtractionPort {
  constructor(
    private readonly apiKey = process.env.OPENAI_API_KEY,
    private readonly model = process.env.OPENAI_VISION_MODEL ?? 'gpt-5.6',
  ) {}

  async extract(input: {
    bytes: Uint8Array
    mimeType: string
    filename: string
    pageNumbers?: number[]
  }) {
    if (!this.apiKey) throw new VisualExtractionUnavailableError('OPENAI_API_KEY is required for visual extraction')
    const requestedPages = input.pageNumbers?.length ? input.pageNumbers : [1]
    const media = input.mimeType === 'application/pdf'
      ? { type: 'input_file', filename: input.filename, file_data: dataUrl(input.bytes, input.mimeType), detail: 'high' }
      : { type: 'input_image', image_url: dataUrl(input.bytes, input.mimeType), detail: 'high' }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        input: [{
          role: 'user',
          content: [
            media,
            {
              type: 'input_text',
              text: visualExtractionPrompt(requestedPages, input.mimeType === 'application/pdf'),
            },
          ],
        }],
        text: {
          format: {
            type: 'json_schema',
            name: 'document_visual_extraction',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['pages'],
              properties: {
                pages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['page', 'text', 'description', 'confidence'],
                    properties: {
                      page: { type: 'integer', minimum: 1 },
                      text: { type: 'string' },
                      description: { type: ['string', 'null'] },
                      confidence: { type: ['number', 'null'], minimum: 0, maximum: 1 },
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
      throw new Error(`Visual extraction failed (${response.status}): ${message}`)
    }

    const payload = await response.json() as ResponsesPayload
    const outputText = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text
    if (!outputText) throw new Error('Visual extraction returned no structured output')
    const parsed = JSON.parse(outputText) as { pages?: VisualExtractionPage[] }
    const requested = new Set(requestedPages)
    const pages = (parsed.pages ?? []).filter((page) => requested.has(page.page))
    if (!pages.length) throw new Error('Visual extraction returned no requested pages')

    return { pages, processor: 'openai-responses-vision', processorVersion: this.model }
  }
}

function dataUrl(bytes: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`
}

function visualExtractionPrompt(pageNumbers: number[], isPdf: boolean) {
  const scope = isPdf ? `Analizza soltanto le pagine ${pageNumbers.join(', ')} del PDF.` : 'Analizza questa immagine come fonte documentale.'
  return `${scope} Trascrivi fedelmente il testo leggibile senza completare parti incerte. Descrivi brevemente solo gli elementi visivi che aggiungono significato documentale (tabelle, timbri, firme, diagrammi o struttura). Restituisci una voce per ogni pagina richiesta, usando il numero di pagina originale. La confidence deve stimare l'affidabilità complessiva della trascrizione tra 0 e 1.`
}