import type { GradeKey } from '@/app/piano-annuale/model'
import type {
  ExtractedPack,
  ExtractedPackSection,
  ExtractedUdaSection,
  HumanTaskContentCandidate,
  HumanTaskPipelineSource,
} from './human-task-content-pipeline'
import type {
  HumanTaskProjectionDraft,
  ProjectionDraftIssue,
  ProjectionRecipePlanBinding,
  ProjectionRecipeResourceKind,
  ProjectionRecipeSurface,
} from './human-task-projection-recipe'

type PackComposedStepSource =
  | { mode: 'HEADING'; heading: string; endHeading?: string }
  | { mode: 'BODY'; heading: string; endHeading: string }
  | { mode: 'ACTIVITY_CLAUSE'; heading: string; clauseIndex: number }

export type PackComposedStepBinding = {
  packCode: string
  source: PackComposedStepSource
}

export type PackComposedResourceBinding = {
  id: string
  packCode: string
  heading: string
  endHeading: string
  kind: ProjectionRecipeResourceKind
  surfaces?: ProjectionRecipeSurface[]
  attachToStep?: number
  promptMode?: 'ALL' | 'NUMBERED'
}

export type PackComposedEvidenceBinding =
  | { mode: 'RESOURCE_TITLES'; resourceIds: string[] }
  | { mode: 'PACK_FIELD'; packCode: string; heading: string; field: 'product' | 'evidence' }

export type HumanTaskPackComposedProjectionRecipe = {
  mode: 'PACK_COMPOSED'
  recipeId: string
  candidateId: string
  grade: GradeKey
  blockId: string
  planBinding: ProjectionRecipePlanBinding
  sourceAlignment: {
    level: 'COMPOSED'
    note: string
  }
  steps: PackComposedStepBinding[]
  resources: PackComposedResourceBinding[]
  outcomes: {
    udaSectionHeading: string
    itemIndexes: number[]
  }
  evidence: PackComposedEvidenceBinding[]
  observation: {
    udaSectionHeading: string
    itemIndexes: number[]
  }
  editorial: {
    why: string
    objective: string
    assessmentNote: string
    continuation: string
  }
}

export function buildPackComposedProjectionDraft(
  candidate: HumanTaskContentCandidate,
  recipe: HumanTaskPackComposedProjectionRecipe,
): HumanTaskProjectionDraft {
  const issues: ProjectionDraftIssue[] = []

  if (candidate.gate.status !== 'READY_FOR_HUMAN_REVIEW') {
    issues.push(issue('CANDIDATE_NOT_REVIEWABLE', 'BLOCKING', 'Il candidato sorgente non ha superato il gate strutturale della pipeline.'))
  }
  if (candidate.candidateId !== recipe.candidateId) {
    issues.push(issue('CANDIDATE_ID_MISMATCH', 'BLOCKING', 'Il Recipe PACK_COMPOSED è legato a una diversa generazione delle fonti.'))
  }
  if (candidate.grade !== recipe.grade || candidate.blockId !== recipe.blockId.toUpperCase()) {
    issues.push(issue('BLOCK_MISMATCH', 'BLOCKING', 'Il Recipe PACK_COMPOSED non appartiene allo stesso grado/blocco del candidato.'))
  }
  if (!samePlanBinding(candidate, recipe.planBinding)) {
    issues.push(issue('PLAN_BINDING_MISMATCH', 'BLOCKING', 'La struttura corrente del Piano annuale non coincide con quella approvata dal Recipe PACK_COMPOSED.'))
  }
  if (!recipe.sourceAlignment.note.trim()) {
    issues.push(issue('COMPOSED_ALIGNMENT_NOTE_REQUIRED', 'BLOCKING', 'Un raccordo PACK_COMPOSED deve spiegare esplicitamente come usa pacchetto principale e pacchetti di supporto.'))
  }
  if (!recipe.steps.length) {
    issues.push(issue('GUIDE_NOT_OPERATIONAL', 'BLOCKING', 'Un Recipe PACK_COMPOSED deve selezionare almeno un passaggio operativo.'))
  }

  for (const [label, value] of Object.entries(recipe.editorial)) {
    if (!value.trim()) issues.push(issue('EDITORIAL_FIELD_EMPTY', 'BLOCKING', `Il campo editoriale ${label} è vuoto.`))
  }

  const selectedPackCodes = new Set<string>()
  const selectedPackHeadings = new Set<string>()

  const steps = recipe.steps.flatMap((binding, index) => {
    const source = findSource(candidate, binding.packCode)
    if (!source || !packAllowed(recipe.planBinding, binding.packCode)) {
      issues.push(issue('GUIDE_NOT_FOUND', 'BLOCKING', `Pacchetto operativo non disponibile o non ammesso dal Piano: ${binding.packCode}.`))
      return []
    }

    const extracted = extractStep(candidate, source, binding, issues)
    if (!extracted) return []
    selectedPackCodes.add(binding.packCode)
    selectedPackHeadings.add(binding.source.heading)
    return [{
      id: `S${String(index + 1).padStart(2, '0')}`,
      minutes: null,
      title: extracted.title,
      instruction: extracted.instruction,
      resourceIds: undefined as string[] | undefined,
    }]
  })

  const resources = recipe.resources.flatMap((binding) => {
    const source = findSource(candidate, binding.packCode)
    if (!source || !packAllowed(recipe.planBinding, binding.packCode)) {
      issues.push(issue('RESOURCE_NOT_FOUND', 'BLOCKING', `Pacchetto risorsa non disponibile o non ammesso dal Piano: ${binding.packCode}.`))
      return []
    }
    const fragment = extractRawRange(source.normalizedText, binding.heading, binding.endHeading)
    if (!fragment) {
      issues.push(issue('RESOURCE_NOT_FOUND', 'BLOCKING', `Risorsa non trovata: ${binding.packCode} / ${binding.heading}.`))
      return []
    }
    if (binding.attachToStep && (binding.attachToStep < 1 || binding.attachToStep > recipe.steps.length)) {
      issues.push(issue('RESOURCE_STEP_NOT_FOUND', 'BLOCKING', `${binding.heading} è collegata a un passaggio inesistente (${binding.attachToStep}).`))
    }
    selectedPackCodes.add(binding.packCode)
    selectedPackHeadings.add(binding.heading)
    return [{
      binding,
      resource: {
        id: binding.id,
        kind: binding.kind,
        title: humanHeading(binding.heading),
        instruction: resourceInstruction(binding.kind),
        prompts: extractPrompts(fragment.body, binding.promptMode ?? 'ALL'),
        ...(binding.surfaces?.length ? { surfaces: [...binding.surfaces] } : {}),
      },
    }]
  })

  const byStep = new Map<number, string[]>()
  for (const item of resources) {
    if (!item.binding.attachToStep) continue
    const current = byStep.get(item.binding.attachToStep) ?? []
    current.push(item.binding.id)
    byStep.set(item.binding.attachToStep, current)
  }
  steps.forEach((step, index) => {
    const resourceIds = byStep.get(index + 1)
    if (resourceIds?.length) step.resourceIds = resourceIds
  })

  const uda = candidate.evidence.uda
  const outcomesSection = findUdaSection(uda?.sections ?? [], recipe.outcomes.udaSectionHeading)
  const observationSection = findUdaSection(uda?.sections ?? [], recipe.observation.udaSectionHeading)
  if (!outcomesSection) issues.push(issue('UDA_SECTION_NOT_FOUND', 'BLOCKING', `Sezione UDA non trovata: ${recipe.outcomes.udaSectionHeading}.`))
  if (!observationSection) issues.push(issue('UDA_SECTION_NOT_FOUND', 'BLOCKING', `Sezione UDA non trovata: ${recipe.observation.udaSectionHeading}.`))
  const outcomes = outcomesSection ? selectItems(outcomesSection, recipe.outcomes.itemIndexes, issues) : []
  const observation = observationSection ? selectItems(observationSection, recipe.observation.itemIndexes, issues) : []

  const resourceById = new Map(resources.map((item) => [item.binding.id, item.resource]))
  const evidenceParts = recipe.evidence.flatMap((binding) => {
    if (binding.mode === 'RESOURCE_TITLES') {
      return binding.resourceIds.flatMap((resourceId) => {
        const resource = resourceById.get(resourceId)
        if (!resource) {
          issues.push(issue('RESOURCE_NOT_FOUND', 'BLOCKING', `La risorsa ${resourceId} richiesta come evidenza non è disponibile.`))
          return []
        }
        return [resource.title]
      })
    }

    const source = findSource(candidate, binding.packCode)
    const pack = findExtractedPack(candidate, binding.packCode)
    const section = pack ? findPackSection(pack, binding.heading) : null
    if (!source || !section || !packAllowed(recipe.planBinding, binding.packCode)) {
      issues.push(issue('GUIDE_NOT_FOUND', 'BLOCKING', `Campo evidenza non trovato: ${binding.packCode} / ${binding.heading}.`))
      return []
    }
    const value = binding.field === 'product' ? section.product : section.evidence
    if (!value) {
      issues.push(issue('GUIDE_NOT_OPERATIONAL', 'BLOCKING', `${binding.heading} non contiene il campo ${binding.field} richiesto come evidenza.`))
      return []
    }
    selectedPackCodes.add(binding.packCode)
    selectedPackHeadings.add(binding.heading)
    return [value]
  })

  if (issues.some((item) => item.severity === 'BLOCKING') || !candidate.sources.uda || !uda || !steps.length || !evidenceParts.length) {
    return invalidDraft(candidate, recipe, issues)
  }

  const selectedPackSources = [...selectedPackCodes].flatMap((code) => {
    const source = findSource(candidate, code)
    return source ? [source] : []
  })

  return {
    draftId: `HTC-DRAFT:${recipe.recipeId}:${candidate.candidateId}`,
    recipeId: recipe.recipeId,
    candidateId: candidate.candidateId,
    status: 'READY_FOR_HUMAN_APPROVAL',
    promotion: 'HUMAN_APPROVAL_REQUIRED',
    issues,
    projection: {
      grade: candidate.grade,
      blockId: candidate.blockId,
      udaCode: candidate.block.udaCode,
      udaTitle: uda.title ?? candidate.block.udaCode,
      packCode: candidate.block.packCode,
      period: candidate.block.period,
      title: candidate.block.title,
      durationMinutes: candidate.block.durationMinutes,
      why: recipe.editorial.why.trim(),
      objective: recipe.editorial.objective.trim(),
      outcomes,
      preparation: [],
      steps,
      resources: resources.map((item) => item.resource),
      evidence: evidenceParts.join(' + '),
      observation,
      assessmentNote: recipe.editorial.assessmentNote.trim(),
      continuation: recipe.editorial.continuation.trim(),
      sourceAlignment: recipe.sourceAlignment,
      provenance: {
        planBinding: { ...recipe.planBinding, supportPackCodes: [...recipe.planBinding.supportPackCodes] },
        candidateId: candidate.candidateId,
        uda: {
          code: candidate.sources.uda.code,
          assetId: candidate.sources.uda.assetId,
          generationId: candidate.sources.uda.generationId,
        },
        packs: selectedPackSources.map((source) => ({ code: source.code, assetId: source.assetId, generationId: source.generationId })),
        selectedUdaPhases: [],
        selectedPackHeadings: [...selectedPackHeadings],
        selectedUdaSectionHeadings: unique([recipe.outcomes.udaSectionHeading, recipe.observation.udaSectionHeading]),
      },
    },
  }
}

function extractStep(
  candidate: HumanTaskContentCandidate,
  source: HumanTaskPipelineSource,
  binding: PackComposedStepBinding,
  issues: ProjectionDraftIssue[],
): { title: string; instruction: string } | null {
  const spec = binding.source
  if (spec.mode === 'ACTIVITY_CLAUSE') {
    const pack = findExtractedPack(candidate, binding.packCode)
    const section = pack ? findPackSection(pack, spec.heading) : null
    const clauses = section?.activity ? splitOperationalClauses(section.activity) : []
    const clause = clauses[spec.clauseIndex - 1]
    if (!section || !clause) {
      issues.push(issue('GUIDE_NOT_FOUND', 'BLOCKING', `Passaggio non trovato: ${binding.packCode} / ${spec.heading} / clausola ${spec.clauseIndex}.`))
      return null
    }
    return { title: sourceDerivedStepTitle(clause), instruction: stripTrailingMinutes(clause) }
  }

  const fragment = extractRawRange(source.normalizedText, spec.heading, spec.endHeading)
  if (!fragment) {
    issues.push(issue('GUIDE_NOT_FOUND', 'BLOCKING', `Passaggio non trovato: ${binding.packCode} / ${spec.heading}.`))
    return null
  }
  const title = humanHeading(spec.heading)
  if (spec.mode === 'HEADING') return { title, instruction: title }
  if (!fragment.body.trim()) {
    issues.push(issue('GUIDE_NOT_OPERATIONAL', 'BLOCKING', `${spec.heading} non contiene un corpo operativo utilizzabile.`))
    return null
  }
  return { title, instruction: fragment.body }
}

function extractRawRange(text: string, heading: string, endHeading?: string) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const start = lines.findIndex((line) => normalize(line) === normalize(heading))
  if (start < 0) return null
  let end = lines.length
  if (endHeading) {
    const relative = lines.slice(start + 1).findIndex((line) => normalize(line) === normalize(endHeading))
    if (relative < 0) return null
    end = start + 1 + relative
  }
  return {
    heading: lines[start].trim(),
    body: cleanParagraph(lines.slice(start + 1, end).join('\n')),
  }
}

function findSource(candidate: HumanTaskContentCandidate, code: string) {
  if (candidate.sources.pack?.code === code) return candidate.sources.pack
  return candidate.sources.supportPacks.find((source) => source.code === code) ?? null
}

function findExtractedPack(candidate: HumanTaskContentCandidate, code: string): ExtractedPack | null {
  if (candidate.evidence.pack?.code === code) return candidate.evidence.pack
  return candidate.evidence.supportPacks.find((pack) => pack.code === code) ?? null
}

function findPackSection(pack: ExtractedPack, heading: string): ExtractedPackSection | null {
  return pack.sections.find((section) => normalize(section.heading) === normalize(heading)) ?? null
}

function packAllowed(binding: ProjectionRecipePlanBinding, code: string) {
  return code === binding.packCode || binding.supportPackCodes.includes(code)
}

function samePlanBinding(candidate: HumanTaskContentCandidate, binding: ProjectionRecipePlanBinding) {
  return candidate.block.planSourceCode === binding.planSourceCode
    && candidate.block.segmentKey === binding.segmentKey
    && candidate.block.udaCode === binding.udaCode
    && candidate.block.packCode === binding.packCode
    && candidate.block.title === binding.title
    && sameStringArray(candidate.block.supportPackCodes, binding.supportPackCodes)
}

function sameStringArray(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function findUdaSection(sections: ExtractedUdaSection[], heading: string): ExtractedUdaSection | null {
  return sections.find((section) => normalize(section.heading) === normalize(heading)) ?? null
}

function selectItems(section: ExtractedUdaSection, indexes: number[], issues: ProjectionDraftIssue[]) {
  return indexes.flatMap((index) => {
    const item = section.listItems[index - 1]
    if (!item) {
      issues.push(issue('UDA_ITEM_NOT_FOUND', 'BLOCKING', `${section.heading}: voce ${index} non disponibile.`))
      return []
    }
    return [item]
  })
}

function splitOperationalClauses(activity: string) {
  const lines = activity.split('\n').map((line) => line.trim()).filter(Boolean)
  const numbered = lines
    .filter((line) => /^\d+[.)]\s+/.test(line))
    .map((line) => line.replace(/^\d+[.)]\s+/, '').trim())
  if (numbered.length) return numbered
  return activity.split(/;\s*/).map((item) => item.trim().replace(/[.;]+$/, '')).filter(Boolean)
}

function sourceDerivedStepTitle(value: string) {
  const words = stripTrailingMinutes(value).replace(/[.;]+$/, '').trim().split(/\s+/).filter(Boolean)
  const compact = words.slice(0, 7).join(' ')
  return compact ? compact.charAt(0).toLocaleUpperCase('it') + compact.slice(1) : 'Passaggio'
}

function stripTrailingMinutes(value: string) {
  return value.replace(/\s*(?:—|-)\s*\d+\s*min\.?$/i, '').trim()
}

function extractPrompts(body: string, mode: 'ALL' | 'NUMBERED') {
  const lines = body.split('\n').map((line) => line.trim()).filter(Boolean)
  const prompts = lines.flatMap((line) => {
    if (/^\d+[.)]\s+/.test(line)) return [line.replace(/^\d+[.)]\s+/, '').trim()]
    if (mode === 'NUMBERED') return []
    if (/^[-•]\s+/.test(line)) return [line.replace(/^[-•]\s+/, '').trim()]
    const separator = line.indexOf(':')
    if (separator > 0) {
      const label = line.slice(0, separator).replace(/[_]+/g, '').trim()
      return label ? [label] : []
    }
    if (line.length <= 160) return [line.replace(/[.;]+$/, '').trim()]
    return []
  })
  return [...new Set(prompts)].slice(0, 16)
}

function resourceInstruction(kind: ProjectionRecipeResourceKind) {
  if (kind === 'TASK_BRIEF') return 'Usa questa traccia nel passaggio indicato senza aggiungere requisiti non presenti nella fonte.'
  if (kind === 'RUBRIC') return 'Consulta i criteri durante l’osservazione e la restituzione.'
  return 'Usa questa risorsa nel passaggio indicato e conserva l’elaborato come evidenza quando pertinente.'
}

function humanHeading(value: string) {
  return value
    .replace(/^\d+\.\s+/, '')
    .replace(/^(?:FASE|SCHEDA|TAVOLA)\s+\d+\s+—\s+/i, '')
    .replace(/^(?:SCHEDA|TAVOLA)\s+[A-Z]\s+—\s+/i, '')
    .replace(/^LEZIONE\s+\d+\s+—\s+/i, '')
    .replace(/\s*\(\d+\s*h\)\s*$/i, '')
    .trim()
    .toLocaleLowerCase('it')
    .replace(/^./u, (first) => first.toLocaleUpperCase('it'))
}

function cleanParagraph(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).join('\n').trim()
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').replace(/\s+/g, ' ').trim()
}

function unique(values: string[]) {
  return [...new Set(values)]
}

function invalidDraft(
  candidate: HumanTaskContentCandidate,
  recipe: HumanTaskPackComposedProjectionRecipe,
  issues: ProjectionDraftIssue[],
): HumanTaskProjectionDraft {
  return {
    draftId: `HTC-DRAFT:${recipe.recipeId}:${candidate.candidateId}`,
    recipeId: recipe.recipeId,
    candidateId: candidate.candidateId,
    status: 'INVALID',
    promotion: 'HUMAN_APPROVAL_REQUIRED',
    issues,
    projection: null,
  }
}

function issue(
  code: ProjectionDraftIssue['code'],
  severity: ProjectionDraftIssue['severity'],
  message: string,
): ProjectionDraftIssue {
  return { code, severity, message }
}
