import { parseTeachingSessionEvidenceNote } from '@/core/domain/teaching-session-reflection'
import type { TeachingSessionAllocation, TeachingSessionRecord } from '@/core/domain/teaching-session'
import { ReplanningReceiptAction } from './ReplanningReceiptAction'

export function SessionReplanningReceipt({
  sectionId,
  session,
  allocations,
  promoted,
}: {
  sectionId: string
  session: TeachingSessionRecord
  allocations: TeachingSessionAllocation[]
  promoted: boolean
}) {
  const reflection = parseTeachingSessionEvidenceNote(session.evidenceNote)?.reflection ?? null
  const sessionAllocations = allocations.filter((allocation) => allocation.sessionId === session.id)
  const allocation = sessionAllocations.length === 1 ? sessionAllocations[0] : null
  const canPromote = Boolean(reflection?.udaChangeProposal.trim() && allocation)

  return (
    <>
      <strong>{promoted ? 'Proposta portata alla riprogettazione.' : 'Attività registrata.'}</strong>
      <span>
        {promoted
          ? 'La proposta è ora da riesaminare. Il Piano e l’UDA non sono stati modificati automaticamente.'
          : `${session.actualMinutes} minuti effettivi sono entrati nel registro di attuazione. Il Piano non viene segnato automaticamente come svolto.`}
      </span>
      {canPromote && !promoted && allocation ? (
        <ReplanningReceiptAction
          sectionId={sectionId}
          teachingSessionId={session.id}
          blockId={allocation.blockId}
        />
      ) : null}
    </>
  )
}
