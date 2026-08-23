import type { HumanTaskPlanGuidedEvidenceDraft } from './human-task-plan-guided-evidence-source'
import {
  HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY,
  type HumanTaskContextStakeholder,
  type HumanTaskStakeholderCognitionAssessment,
  type HumanTaskStakeholderCognitiveReview,
} from './human-task-stakeholder-cognition'

export function assessPlanGuidedStakeholderCognition(
  items: HumanTaskPlanGuidedEvidenceDraft[],
): HumanTaskStakeholderCognitiveReview {
  return {
    policyVersion: HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY.policyVersion,
    required: true,
    assessments: [
      assessTeacher(items),
      assessLearner(items),
      assessReviewer(items),
      assessAutomation(items),
    ],
    note: 'Valutazione derivata dalle proiezioni effettive, dalla provenienza dell’evidenza e dai confini di promozione del ciclo.',
  }
}

function assessTeacher(items: HumanTaskPlanGuidedEvidenceDraft[]) {
  const stakeholder: HumanTaskContextStakeholder = 'TEACHER_OPERATOR'
  const failures: string[] = []
  const evidence: string[] = []

  if (!items.length) failures.push('Nessuna proiezione disponibile.')
  for (const item of items) {
    const projection = item.draft.projection
    if (item.draft.status !== 'READY_FOR_HUMAN_APPROVAL' || !projection) {
      failures.push(`${item.draft.candidateId}: proiezione non pronta.`)
      continue
    }
    if (![projection.why, projection.objective, projection.evidence, projection.assessmentNote, projection.continuation].every((value) => value.trim())) {
      failures.push(`${projection.blockId}: mancano orientamento, obiettivo, evidenza, valutazione o continuazione.`)
    }
    if (!projection.sourceAlignment.note?.trim()) failures.push(`${projection.blockId}: raccordo delle fonti non spiegato.`)
    evidence.push(`${projection.blockId}: obiettivo + sequenza + evidenza + valutazione + continuazione + provenienza.`)
  }

  return assessment(stakeholder, failures, evidence)
}

function assessLearner(items: HumanTaskPlanGuidedEvidenceDraft[]) {
  const stakeholder: HumanTaskContextStakeholder = 'LEARNER'
  const failures: string[] = []
  const evidence: string[] = []
  let closesFeedbackLoop = false

  if (!items.length) failures.push('Nessuna proiezione disponibile.')
  for (const item of items) {
    const projection = item.draft.projection
    if (!projection) {
      failures.push(`${item.draft.candidateId}: contenuto alunno non disponibile.`)
      continue
    }
    if (!projection.objective.trim() || !projection.steps.length || projection.steps.some((step) => !step.instruction.trim())) {
      failures.push(`${projection.blockId}: obiettivo o consegna operativa incompleti.`)
    }
    if (!projection.evidence.trim()) failures.push(`${projection.blockId}: prodotto/evidenza attesa non esplicita.`)
    if (!projection.observation.length) failures.push(`${projection.blockId}: criteri osservabili assenti.`)

    const searchable = [
      projection.objective,
      projection.evidence,
      projection.assessmentNote,
      ...projection.observation,
      ...projection.steps.map((step) => step.instruction),
    ].join(' ')
    if (/verific|controll|miglior|autovalut/i.test(searchable)) closesFeedbackLoop = true
    evidence.push(`${projection.blockId}: obiettivo + azioni + prodotto/evidenza + criteri osservabili.`)
  }
  if (!closesFeedbackLoop) failures.push('La tranche non rende visibile alcun ciclo di verifica, miglioramento o autovalutazione.')

  return assessment(stakeholder, failures, evidence)
}

function assessReviewer(items: HumanTaskPlanGuidedEvidenceDraft[]) {
  const stakeholder: HumanTaskContextStakeholder = 'PROFESSIONAL_REVIEWER'
  const failures: string[] = []
  const evidence: string[] = []

  if (!items.length) failures.push('Nessuna proiezione disponibile.')
  for (const item of items) {
    const projection = item.draft.projection
    if (!projection) {
      failures.push(`${item.draft.candidateId}: proiezione non verificabile.`)
      continue
    }
    if (!projection.provenance.planBinding.planSourceCode || !projection.provenance.uda.generationId || !projection.provenance.candidateId) {
      failures.push(`${projection.blockId}: provenienza canonica incompleta.`)
    }
    if (item.evidenceBinding.source === 'UDA_PHASES') {
      const selected = new Set(projection.provenance.selectedUdaPhases)
      if (item.evidenceBinding.phaseOrdinals.some((ordinal) => !selected.has(ordinal))) {
        failures.push(`${projection.blockId}: evidenza UDA non coincide con le fasi registrate nella provenienza.`)
      }
      if (!/Evidenza operativa: sostenuta dalle fasi UDA/i.test(projection.sourceAlignment.note ?? '')) {
        failures.push(`${projection.blockId}: la provenienza UDA dell’evidenza non è dichiarata nel raccordo.`)
      }
    }
    evidence.push(`${projection.blockId}: ${projection.provenance.planBinding.planSourceCode} + ${projection.provenance.uda.code}/${projection.provenance.uda.generationId} + binding evidenza ${item.evidenceBinding.source}.`)
  }

  return assessment(stakeholder, failures, evidence)
}

function assessAutomation(items: HumanTaskPlanGuidedEvidenceDraft[]) {
  const stakeholder: HumanTaskContextStakeholder = 'ASSISTED_AUTOMATION'
  const failures: string[] = []
  const evidence: string[] = []

  if (!items.length) failures.push('Nessuna proiezione disponibile.')
  for (const item of items) {
    const projection = item.draft.projection
    if (item.draft.promotion !== 'HUMAN_APPROVAL_REQUIRED') {
      failures.push(`${item.draft.candidateId}: confine di approvazione umana assente.`)
    }
    if (item.draft.issues.some((issue) => issue.severity === 'BLOCKING')) {
      failures.push(`${item.draft.candidateId}: persistono issue bloccanti.`)
    }
    if (!projection) continue
    if (item.evidenceBinding.source === 'UDA_PHASES') {
      const selected = new Set(projection.provenance.selectedUdaPhases)
      if (item.evidenceBinding.phaseOrdinals.some((ordinal) => !selected.has(ordinal))) {
        failures.push(`${projection.blockId}: l’automazione userebbe una fase non autorizzata per l’evidenza.`)
      }
    }
    evidence.push(`${projection.blockId}: HUMAN_APPROVAL_REQUIRED; fasi ${projection.provenance.selectedUdaPhases.join('+')}; evidenza ${item.evidenceBinding.source}.`)
  }

  return assessment(stakeholder, failures, evidence)
}

function assessment(
  stakeholder: HumanTaskContextStakeholder,
  failures: string[],
  evidence: string[],
): HumanTaskStakeholderCognitionAssessment {
  const questions = HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY.requirements[stakeholder]
  const status = failures.length ? 'BLOCKED' : 'SATISFIED'
  return {
    stakeholder,
    status,
    answeredQuestions: status === 'SATISFIED' ? [...questions] : [],
    evidence,
    note: status === 'SATISFIED'
      ? 'Tutte le domande cognitive richieste risultano risolte da informazioni e provenienza presenti nella tranche.'
      : failures.join(' '),
  }
}
