import { extractCanonicalPack, type HumanTaskPipelineSource } from './human-task-content-pipeline'
import {
  compileHumanTaskTrancheReview,
  type CompileHumanTaskTrancheInput,
  type HumanTaskTrancheCompilerReview,
} from './human-task-tranche-compiler'

export type HumanTaskCompilerSourceAdapterResult = {
  review: HumanTaskTrancheCompilerReview
  adapterNotes: string[]
}

/**
 * Compiler-only compatibility adapter for canonical PACKs whose headings are
 * explicit but use a compact title-case grammar not yet recognized by the P1
 * parser. It never rewrites the stored source and never adds source content.
 */
export function compileHumanTaskTrancheReviewFromCanonicalSources(
  input: CompileHumanTaskTrancheInput,
): HumanTaskCompilerSourceAdapterResult {
  const notes: string[] = []
  const sources = input.sources.map((source) => adaptCompactPack(source, notes))
  const review = compileHumanTaskTrancheReview({ ...input, sources })
  return {
    review: {
      ...review,
      sourceBindings: review.sourceBindings.map((binding) => {
        const original = input.sources.find((source) => source.code === binding.code)
        return original
          ? { code: original.code, assetId: original.assetId, generationId: original.generationId }
          : binding
      }),
      issues: [...notes, ...review.issues],
    },
    adapterNotes: notes,
  }
}

function adaptCompactPack(source: HumanTaskPipelineSource, notes: string[]): HumanTaskPipelineSource {
  if (!source.code.startsWith('CAN-PACK-')) return source
  if (extractCanonicalPack(source.code, source.normalizedText).sections.length) return source

  const normalizedText = normalizeCompactPackHeadings(source.normalizedText)
  if (normalizedText === source.normalizedText) return source
  if (!extractCanonicalPack(source.code, normalizedText).sections.length) return source

  notes.push(`${source.code}: grammatica compatta delle intestazioni normalizzata solo in memoria per il compilatore; la fonte KB non è stata modificata.`)
  return { ...source, normalizedText }
}

function normalizeCompactPackHeadings(value: string) {
  const headings = new Map<string, string>([
    ['finalita', '1. FINALITÀ'],
    ['risultati attesi', '2. RISULTATI ATTESI'],
    ['percorso', '3. PERCORSO'],
    ['compito autentico', '4. COMPITO AUTENTICO'],
    ['valutazione', '5. VALUTAZIONE'],
    ['cittadinanza digitale, inclusione e validazione', '6. CITTADINANZA DIGITALE, INCLUSIONE E VALIDAZIONE'],
  ])

  return value
    .split(/\r?\n/)
    .map((line) => {
      const replacement = headings.get(normalizeHeading(line))
      return replacement ?? line
    })
    .join('\n')
}

function normalizeHeading(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it')
    .replace(/\s+/g, ' ')
    .trim()
}
