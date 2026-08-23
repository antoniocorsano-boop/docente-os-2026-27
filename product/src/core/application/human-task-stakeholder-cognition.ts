export type HumanTaskContextStakeholder =
  | 'TEACHER_OPERATOR'
  | 'LEARNER'
  | 'PROFESSIONAL_REVIEWER'
  | 'ASSISTED_AUTOMATION'

export type HumanTaskStakeholderCognitionStatus = 'PENDING' | 'SATISFIED' | 'BLOCKED'

export type HumanTaskStakeholderCognitionAssessment = {
  stakeholder: HumanTaskContextStakeholder
  status: HumanTaskStakeholderCognitionStatus
  answeredQuestions: string[]
  evidence: string[]
  note: string
}

export type HumanTaskStakeholderCognitiveReview = {
  policyVersion: 1
  required: true
  assessments: HumanTaskStakeholderCognitionAssessment[]
  note: string
}

export const HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY = {
  policyVersion: 1,
  principle: 'Una proposta può essere promossa solo se ogni stakeholder del contesto riceve le informazioni necessarie per capire il proprio compito, i criteri, la provenienza e i limiti decisionali senza dipendere da inferenze nascoste.',
  requirements: {
    TEACHER_OPERATOR: [
      'Dove sono e quale parte del percorso sto preparando o conducendo?',
      'Che cosa devo fare adesso e perché?',
      'Quale evidenza devo osservare o registrare?',
      'Da quali fonti deriva la proposta?',
      'Che cosa richiede ancora una decisione umana?',
    ],
    LEARNER: [
      'Qual è il problema o obiettivo da affrontare?',
      'Che cosa devo fare concretamente?',
      'Che cosa devo produrre o rendere osservabile?',
      'Con quali criteri posso controllare il mio lavoro?',
      'Come posso verificare, migliorare o autovalutare il risultato?',
    ],
    PROFESSIONAL_REVIEWER: [
      'La proposta rispetta Piano, UDA e fonti canoniche pertinenti?',
      'Quali elementi sono documentati, proposti o approvati umanamente?',
      'La provenienza delle evidenze è verificabile?',
      'La decisione professionale resta attribuita alla persona competente?',
      'La promozione lascia una traccia auditabile?',
    ],
    ASSISTED_AUTOMATION: [
      'Quali dati e capability sono effettivamente disponibili?',
      'Quali elementi può derivare deterministicamente?',
      'Quali elementi non può inventare o assumere?',
      'In quale punto deve fermarsi e chiedere una decisione umana?',
      'Quale provenienza deve preservare dopo la promozione?',
    ],
  } satisfies Record<HumanTaskContextStakeholder, readonly string[]>,
} as const

export function createPendingHumanTaskStakeholderCognitiveReview(): HumanTaskStakeholderCognitiveReview {
  return {
    policyVersion: HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY.policyVersion,
    required: true,
    assessments: (Object.keys(HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY.requirements) as HumanTaskContextStakeholder[]).map((stakeholder) => ({
      stakeholder,
      status: 'PENDING',
      answeredQuestions: [],
      evidence: [],
      note: 'Adempimento cognitivo non ancora verificato.',
    })),
    note: 'La promozione resta bloccata finché tutti gli stakeholder di contesto non risultano cognitivamente serviti.',
  }
}

export function isHumanTaskStakeholderCognitiveReviewComplete(review: HumanTaskStakeholderCognitiveReview) {
  const byStakeholder = new Map(review.assessments.map((assessment) => [assessment.stakeholder, assessment]))

  for (const [stakeholder, requiredQuestions] of Object.entries(HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY.requirements) as Array<[
    HumanTaskContextStakeholder,
    readonly string[],
  ]>) {
    const assessment = byStakeholder.get(stakeholder)
    if (!assessment || assessment.status !== 'SATISFIED') return false
    if (!assessment.note.trim() || assessment.evidence.length === 0) return false
    if (requiredQuestions.some((question) => !assessment.answeredQuestions.includes(question))) return false
  }

  return byStakeholder.size === Object.keys(HUMAN_TASK_STAKEHOLDER_COGNITIVE_POLICY.requirements).length
}
