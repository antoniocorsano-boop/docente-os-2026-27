import type { LessonDesignExtension } from './lesson-design-extension'

export type LessonPreparationStatus = 'READY' | 'NEEDS_CONFIRMATION' | 'NEEDS_CHECK'

export type LessonPreparationReceipt = {
  id: string
  workspaceId: string
  academicYearId: string
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  projectionId: string
  checklistSnapshot: string[]
  designFingerprint: string
  confirmedBy: string
  confirmedAt: string
  updatedAt: string
}

export type LessonPreparationState = {
  status: LessonPreparationStatus
  label: 'Pronta' | 'Da confermare' | 'Da controllare'
  reason: string
  pendingProposalCount: number
}

export function lessonDesignFingerprint(extensions: LessonDesignExtension[]) {
  return extensions
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((extension) => [
      extension.id,
      extension.status,
      extension.kind,
      extension.updatedAt,
      extension.acceptedAt ?? '',
    ].join(':'))
    .join('|') || 'NO_EXTENSIONS'
}

export function resolveLessonPreparationState(input: {
  projectionId: string
  preparation: string[]
  extensions: LessonDesignExtension[]
  receipt: LessonPreparationReceipt | null
}): LessonPreparationState {
  const pendingProposalCount = input.extensions.filter((extension) => extension.status === 'PROPOSED').length
  if (pendingProposalCount > 0) {
    return {
      status: 'NEEDS_CONFIRMATION',
      label: 'Da confermare',
      reason: pendingProposalCount === 1
        ? 'C’è una proposta per la lezione che richiede ancora una tua decisione.'
        : `Ci sono ${pendingProposalCount} proposte per la lezione che richiedono ancora una tua decisione.`,
      pendingProposalCount,
    }
  }

  if (!input.receipt) {
    return {
      status: 'NEEDS_CHECK',
      label: 'Da controllare',
      reason: 'La preparazione canonica è disponibile, ma non hai ancora confermato di avere predisposto ciò che serve.',
      pendingProposalCount: 0,
    }
  }

  const fingerprint = lessonDesignFingerprint(input.extensions)
  if (
    input.receipt.projectionId !== input.projectionId
    || input.receipt.designFingerprint !== fingerprint
    || !sameChecklist(input.receipt.checklistSnapshot, input.preparation)
  ) {
    return {
      status: 'NEEDS_CHECK',
      label: 'Da controllare',
      reason: 'La lezione è cambiata dopo l’ultima conferma di preparazione. Controlla di nuovo materiali e indicazioni.',
      pendingProposalCount: 0,
    }
  }

  return {
    status: 'READY',
    label: 'Pronta',
    reason: 'Hai confermato la preparazione sulla versione corrente della lezione e non risultano proposte in attesa.',
    pendingProposalCount: 0,
  }
}

function sameChecklist(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index])
}
