import type { ProvisionalTechnologyReference } from './cml-provisional-technology-reference'

export type CurricoloFacet = 'obiettivi' | 'conoscenze' | 'evidenze'
export type CurricoloWorkKind = 'ATTIVITA' | 'LEZIONE' | 'UDA' | 'PERCORSO'

export type CurricoloExcerpt = {
  id: string
  facet: CurricoloFacet
  sourceIndex: number
  excerptIndex: number
  text: string
  /** The complete, unaltered annual item returned by the verified Arena release. */
  originalText: string
  /** Semicolon-separated items are editorial reading aids, NOT Arena nodes. */
  editorialExcerpt: boolean
}

export type CurricoloWorkProposal = {
  kind: CurricoloWorkKind
  title: string
  theme: string
  objective: string
  evidence: string
  task: string
  resources: string
  duration: string
  steps: string
  observation: string
  source: {
    segmentId: string
    sourceVersion: string
    schoolYearRef: string
    framework: ProvisionalTechnologyReference['framework']
    sourceField: CurricoloFacet
    sourceIndex: number
    originalText: string
    selectedText: string
    authority: 'PROVISIONAL_NOT_IN_FORCE'
  }
}

const FACETS: readonly CurricoloFacet[] = ['obiettivi', 'conoscenze', 'evidenze']

/**
 * Only verified server data is accepted. A semicolon fragment is never
 * promoted to an institutional objective, node ID or curricolo adoption.
 */
export function curricoloReadingExcerpts(
  reference: ProvisionalTechnologyReference,
): CurricoloExcerpt[] {
  return FACETS.flatMap(facet =>
    reference[facet].flatMap((originalText, sourceIndex) => {
      const excerpts = originalText.split(';').map(value => value.trim()).filter(Boolean)
      return excerpts.map((text, excerptIndex) => ({
        id: `${facet}:${sourceIndex}:${excerptIndex}`,
        facet,
        sourceIndex,
        excerptIndex,
        text,
        originalText,
        editorialExcerpt: excerpts.length > 1,
      }))
    }),
  )
}

export function searchCurricoloExcerpts(
  excerpts: readonly CurricoloExcerpt[],
  query: string,
): CurricoloExcerpt[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (!words.length) return [...excerpts]
  return excerpts.filter(excerpt => {
    const searchable = normalizeSearch(excerpt.text)
    return words.every(word => searchable.includes(word))
  })
}

export function curricoloExcerptById(
  reference: ProvisionalTechnologyReference,
  id: string,
): CurricoloExcerpt | null {
  return curricoloReadingExcerpts(reference).find(item => item.id === id) ?? null
}

export function createCurricoloWorkProposal(input: {
  reference: ProvisionalTechnologyReference
  selected: CurricoloExcerpt
  kind: CurricoloWorkKind
  theme?: string
  evidence?: string
}): CurricoloWorkProposal {
  const { reference, selected, kind } = input
  if (reference.status !== 'PROVISIONAL_NOT_IN_FORCE' || reference.writeAllowed !== false) {
    throw new Error('The curricolo reference must remain provisional and read-only')
  }
  const actual = curricoloExcerptById(reference, selected.id)
  if (!actual || actual.text !== selected.text || actual.originalText !== selected.originalText) {
    throw new Error('Selected curricolo text is not backed by the verified source')
  }
  const evidence = input.evidence?.trim() ?? ''
  if (evidence && !reference.evidenze.some(text => text === evidence
    || text.split(';').map(item => item.trim()).includes(evidence))) {
    throw new Error('Selected evidence does not belong to the verified curricolo segment')
  }

  const theme = input.theme?.trim() || actual.text
  const common = {
    kind,
    theme,
    objective: actual.text,
    evidence,
    task: '',
    resources: '',
    duration: '',
    steps: '',
    observation: '',
    source: {
      segmentId: reference.segmentId,
      sourceVersion: reference.sourceVersion,
      schoolYearRef: reference.schoolYearRef,
      framework: reference.framework,
      sourceField: actual.facet,
      sourceIndex: actual.sourceIndex,
      originalText: actual.originalText,
      selectedText: actual.text,
      authority: 'PROVISIONAL_NOT_IN_FORCE' as const,
    },
  }
  switch (kind) {
    case 'ATTIVITA':
      return { ...common, title: `Attività · ${theme}`, task: 'Descrivi il compito concreto degli alunni.', steps: 'Avvio; svolgimento; restituzione.', observation: 'Che cosa osserverai per verificare il risultato?' }
    case 'LEZIONE':
      return { ...common, title: `Lezione · ${theme}`, task: 'Formula la domanda guida della lezione.', steps: 'Attivazione; esplorazione guidata; rielaborazione; verifica formativa.', observation: 'Quale evidenza raccoglierai durante la lezione?' }
    case 'UDA':
      return { ...common, title: `UDA · ${theme}`, task: 'Definisci una situazione-problema e un prodotto significativo.', steps: 'Problema iniziale; esplorazione; produzione; condivisione e revisione.', observation: 'Quali evidenze e criteri di osservazione userai?' }
    case 'PERCORSO':
      return { ...common, title: `Percorso · ${theme}`, task: 'Definisci il risultato finale e la progressione delle attività.', steps: 'Esplorare il problema; approfondire; sperimentare; discutere e documentare.', observation: 'Come riconoscerai la progressione degli apprendimenti?' }
  }
}

export function curricoloProposalAsMarkdown(proposal: CurricoloWorkProposal): string {
  const fields: [string, string][] = [
    ['Tema e contesto', proposal.theme],
    ['Obiettivo di lavoro (estratto dalla fonte)', proposal.objective],
    ['Evidenza selezionata', proposal.evidence || 'Da scegliere e verificare'],
    ['Compito o situazione di apprendimento', proposal.task],
    ['Risorse', proposal.resources || 'Da definire'],
    ['Durata', proposal.duration || 'Da definire'],
    ['Fasi di lavoro', proposal.steps],
    ['Osservazione e verifica', proposal.observation],
  ]
  return [
    `# ${proposal.title}`,
    '',
    'BOZZA PERSONALE DI PROGETTAZIONE — DA RIVEDERE DAL DOCENTE',
    ...fields.flatMap(([name, value]) => ['', `## ${name}`, value]),
    '',
    '## Provenienza e stato',
    `Arena, master ${proposal.source.sourceVersion}; segmento ${proposal.source.segmentId}; ${proposal.source.schoolYearRef}; ${proposal.source.framework}.`,
    `Campo originale: ${proposal.source.sourceField} [${proposal.source.sourceIndex + 1}].`,
    `Testo integrale della fonte: ${proposal.source.originalText}`,
    'Fonte provvisoria, NON vigente e NON approvata. Questa bozza non è una modifica al curricolo.',
  ].join('\n')
}

function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase('it').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
