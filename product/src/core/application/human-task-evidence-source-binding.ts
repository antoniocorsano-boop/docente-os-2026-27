import type { HumanTaskContentCandidate } from './human-task-content-pipeline'

export type HumanTaskEvidenceSourceBinding =
  | { kind: 'PLAN_BLOCK' }
  | { kind: 'UDA_SECTION_ITEMS'; sectionHeading: string; itemIndexes: number[] }
  | { kind: 'UDA_PHASES'; phaseOrdinals: number[] }

export type HumanTaskEvidenceProvenance = {
  sourceRole: 'PLAN' | 'UDA'
  sourceCode: string
  rationale: string
  binding: HumanTaskEvidenceSourceBinding
}

export function isValidHumanTaskEvidenceBinding(provenance: HumanTaskEvidenceProvenance) {
  if (!provenance.sourceCode.trim() || !provenance.rationale.trim()) return false
  if (provenance.sourceRole === 'PLAN') return provenance.binding.kind === 'PLAN_BLOCK'
  if (provenance.binding.kind === 'UDA_SECTION_ITEMS') {
    return Boolean(provenance.binding.sectionHeading.trim())
      && provenance.binding.itemIndexes.length > 0
      && provenance.binding.itemIndexes.every((index) => Number.isInteger(index) && index > 0)
      && new Set(provenance.binding.itemIndexes).size === provenance.binding.itemIndexes.length
  }
  if (provenance.binding.kind === 'UDA_PHASES') {
    return provenance.binding.phaseOrdinals.length > 0
      && provenance.binding.phaseOrdinals.every((ordinal) => Number.isInteger(ordinal) && ordinal > 0)
      && new Set(provenance.binding.phaseOrdinals).size === provenance.binding.phaseOrdinals.length
  }
  return false
}

/** Resolve approved evidence from the current extracted UDA rather than accepting free editorial text. */
export function resolveHumanTaskEvidenceFromCandidate(
  candidate: HumanTaskContentCandidate,
  provenance: HumanTaskEvidenceProvenance,
) {
  if (provenance.sourceRole !== 'UDA' || provenance.binding.kind === 'PLAN_BLOCK') {
    throw new Error('La derivazione automatica è disponibile soltanto per binding UDA espliciti.')
  }
  if (!isValidHumanTaskEvidenceBinding(provenance)) throw new Error('Binding di provenienza dell’evidenza non valido.')
  if (candidate.sources.uda?.code !== provenance.sourceCode || !candidate.evidence.uda) {
    throw new Error('La fonte UDA corrente non coincide con la provenienza dichiarata.')
  }

  const uda = candidate.evidence.uda
  const binding = provenance.binding
  if (binding.kind === 'UDA_SECTION_ITEMS') {
    const sectionHeading = binding.sectionHeading
    const section = uda.sections.find((item) => normalize(item.heading) === normalize(sectionHeading))
    if (!section) throw new Error(`Sezione UDA non trovata: ${sectionHeading}.`)
    return binding.itemIndexes.map((index) => {
      const item = section.listItems[index - 1]
      if (!item?.trim()) throw new Error(`${section.heading}: voce ${index} non disponibile.`)
      return stripTerminalPunctuation(clean(item))
    }).join(' · ')
  }

  return binding.phaseOrdinals.map((ordinal) => {
    const phase = uda.phases.find((item) => item.ordinal === ordinal)
    if (!phase?.content.trim()) throw new Error(`Fase UDA ${ordinal} non disponibile per l’evidenza.`)
    return clean(phase.content)
  }).join(' ')
}

function stripTerminalPunctuation(value: string) {
  return value.replace(/[;,.]+$/u, '').trim()
}

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it')
    .replace(/^\d+\.\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}
