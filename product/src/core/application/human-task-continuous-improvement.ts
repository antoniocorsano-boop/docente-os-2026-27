export type HumanTaskImprovementDisposition =
  | 'PENDING'
  | 'NO_GENERALIZABLE_CHANGE'
  | 'SYSTEM_IMPROVEMENT_APPLIED'
  | 'SYSTEM_IMPROVEMENT_REQUIRED'

export type HumanTaskImprovementReview = {
  policyVersion: 1
  required: true
  disposition: HumanTaskImprovementDisposition
  note: string
}

export const HUMAN_TASK_CONTINUOUS_IMPROVEMENT_POLICY = {
  policyVersion: 1,
  principle: 'Ogni ciclo governato deve verificare se l’attrito incontrato può essere rimosso dal sistema prima di ripetere altro lavoro manuale.',
  rules: [
    'Automatizzare meccaniche ripetitive prima di moltiplicare file o casi speciali.',
    'Una miglioria generalizzabile deve diventare contratto, codice o test; non restare solo nella conversazione.',
    'Le migliorie meccaniche possono essere applicate automaticamente se preservano i contratti esistenti e superano i gate.',
    'Le decisioni didattiche o semantiche restano soggette ad approvazione umana.',
    'Ambiguità, drift di fonte o perdita di provenienza devono continuare a fallire chiusi.',
    'Non è una miglioria ridurre test, RLS, validazioni, tracciabilità o qualità per accelerare la consegna.',
  ] as const,
} as const

export function createPendingHumanTaskImprovementReview(): HumanTaskImprovementReview {
  return {
    policyVersion: HUMAN_TASK_CONTINUOUS_IMPROVEMENT_POLICY.policyVersion,
    required: true,
    disposition: 'PENDING',
    note: 'Valutazione di miglioramento del ciclo non ancora registrata.',
  }
}

export function isHumanTaskImprovementReviewComplete(review: HumanTaskImprovementReview) {
  return review.disposition === 'NO_GENERALIZABLE_CHANGE'
    || review.disposition === 'SYSTEM_IMPROVEMENT_APPLIED'
}
