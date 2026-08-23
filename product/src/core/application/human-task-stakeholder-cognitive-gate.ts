import type { HumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import {
  isValidHumanTaskEvidenceBinding,
  type HumanTaskEvidenceProvenance,
} from './human-task-evidence-source-binding'

export type HumanTaskStakeholder = 'TEACHER' | 'LEARNER' | 'COORDINATION' | 'GOVERNANCE' | 'SYSTEM'

export const HUMAN_TASK_REQUIRED_STAKEHOLDERS: readonly HumanTaskStakeholder[] = [
  'TEACHER',
  'LEARNER',
  'COORDINATION',
  'GOVERNANCE',
  'SYSTEM',
]

export type HumanTaskCognitiveGateInput = {
  projection: HumanTaskLessonProjection
  evidenceProvenance: HumanTaskEvidenceProvenance
  humanDecision: {
    decision: 'APPROVE' | 'PENDING'
    rationale: string
  }
}

export type HumanTaskStakeholderGateResult = {
  stakeholder: HumanTaskStakeholder
  status: 'PASS' | 'FAIL'
  missing: string[]
}

export type HumanTaskCognitiveGateResult = {
  status: 'PASS' | 'FAIL'
  stakeholders: HumanTaskStakeholderGateResult[]
}

export function evaluateHumanTaskStakeholderCognitiveGate(input: HumanTaskCognitiveGateInput): HumanTaskCognitiveGateResult {
  const { projection, evidenceProvenance, humanDecision } = input
  const sourceCodes = new Set(projection.sources.map((source) => source.code))

  const teacher = result('TEACHER', [
    required('contesto della lezione', projection.title && projection.udaTitle && projection.period),
    required('finalità e obiettivo', projection.why && projection.objective),
    required('sequenza operativa', validSteps(projection)),
    required('evidenza attesa', projection.evidence),
    required('criteri di osservazione', projection.observation.length > 0),
    required('continuità', projection.continuation),
  ])

  const learnerSearchable = [
    projection.objective,
    projection.evidence,
    projection.assessmentNote,
    projection.continuation,
    ...projection.observation,
    ...projection.steps.map((step) => `${step.title} ${step.instruction}`),
  ].join(' ')
  const learner = result('LEARNER', [
    required('problema o obiettivo comprensibile', projection.objective),
    required('azioni concrete', validSteps(projection)),
    required('prodotto o evidenza attesa', projection.evidence),
    required('criteri per controllare il lavoro', projection.observation.length > 0),
    required('possibilità di confronto, verifica, miglioramento o autovalutazione', /criter|confront|coeren|controll|verific|miglior|autovalut/i.test(learnerSearchable)),
  ])

  const coordination = result('COORDINATION', [
    required('raccordo tra fonti', projection.sourceAlignment.level === 'DIRECT' || Boolean(projection.sourceAlignment.note?.trim())),
    required('Piano canonico', projection.sources.some((source) => source.role === 'PLAN')),
    required('UDA canonica', projection.sources.some((source) => source.role === 'UDA')),
    required('provenienza dell’evidenza', isValidHumanTaskEvidenceBinding(evidenceProvenance) && sourceCodes.has(evidenceProvenance.sourceCode)),
  ])

  const governance = result('GOVERNANCE', [
    required('nota di valutazione', projection.assessmentNote),
    required('decisione umana esplicita', humanDecision.decision === 'APPROVE'),
    required('motivazione della decisione', humanDecision.rationale),
    required('tracciabilità delle fonti didattiche', projection.sources.length >= 2),
  ])

  const system = result('SYSTEM', [
    required('identità della proiezione', projection.projectionId && projection.blockId && projection.udaCode),
    required('durata canonica', projection.durationMinutes > 0),
    required('binding evidenza valido', isValidHumanTaskEvidenceBinding(evidenceProvenance)),
    required('codice fonte evidenza', sourceCodes.has(evidenceProvenance.sourceCode)),
    required('nessun riferimento risorsa rotto', validResourceBindings(projection)),
  ])

  const stakeholders = [teacher, learner, coordination, governance, system]
  return {
    status: stakeholders.every((item) => item.status === 'PASS') ? 'PASS' : 'FAIL',
    stakeholders,
  }
}

function result(stakeholder: HumanTaskStakeholder, checks: Array<{ label: string; ok: boolean }>): HumanTaskStakeholderGateResult {
  const missing = checks.filter((check) => !check.ok).map((check) => check.label)
  return { stakeholder, status: missing.length ? 'FAIL' : 'PASS', missing }
}

function required(label: string, value: unknown) {
  return { label, ok: Boolean(value) }
}

function validSteps(projection: HumanTaskLessonProjection) {
  return projection.steps.length > 0 && projection.steps.every((step) => Boolean(step.title && step.instruction))
}

function validResourceBindings(projection: HumanTaskLessonProjection) {
  const ids = new Set(projection.resources.map((resource) => resource.id))
  return projection.steps.every((step) => (step.resourceIds ?? []).every((resourceId) => ids.has(resourceId)))
}

export type { HumanTaskEvidenceProvenance } from './human-task-evidence-source-binding'
