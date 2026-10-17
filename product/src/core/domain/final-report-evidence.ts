import type { TeachingEvidenceReference, TeachingObservation } from './teaching-evidence'
import {
  currentTeachingSessions,
  type TeachingSessionAllocationRecord,
  type TeachingSessionRecord,
  type TeachingSessionSnapshot,
} from './teaching-session'

export type FinalReportReadiness =
  | 'DATI_INSUFFICIENTI'
  | 'PRONTA_PER_BOZZA'
  | 'RICHIEDE_INTEGRAZIONI'
  | 'PRONTA_PER_REVISIONE'

export type FinalReportConsistencyCode =
  | 'PLAN_BLOCK_WITHOUT_SESSION'
  | 'SESSION_ON_PLANNED_BLOCK'
  | 'UNALLOCATED_SESSION'
  | 'REMAPPED_BLOCK'
  | 'RECOVERED_BLOCK'
  | 'CANCELLED_BLOCK'
  | 'MISSING_ACTIVE_INSTITUTIONAL_BASE'
  | 'MISSING_ACTIVE_TEMPLATE'
  | 'MISSING_DISCIPLINE_CONTEXT'

export type FinalReportConsistencyFinding = {
  code: FinalReportConsistencyCode
  blockId?: string
  sessionId?: string
}

export type FinalReportPlanBlockState =
  | 'PIANIFICATO'
  | 'SVOLTO'
  | 'RIMODULATO'
  | 'RECUPERATO'
  | 'ANNULLATO'

export type FinalReportPlannedBlock = {
  blockId: string
  state: FinalReportPlanBlockState
}

export type FinalReportEvidenceContext = {
  workspaceId: string
  academicYearId: string
  sectionId: string
  disciplineId: string | null
}

export type FinalReportInstitutionalSources = {
  hasActiveInstitutionalBase: boolean
  hasActiveFinalReportTemplate: boolean
}

export type FinalReportEvidenceInput = {
  context: FinalReportEvidenceContext
  plannedBlocks: FinalReportPlannedBlock[]
  teachingSessions: TeachingSessionSnapshot
  observations: TeachingObservation[]
  evidenceReferences: TeachingEvidenceReference[]
  materialUsageReceipts: unknown[]
  institutionalSources: FinalReportInstitutionalSources
  humanRequired: string[]
  evidenceFreshness: string
}

export type FinalReportEvidenceBundle = {
  context: FinalReportEvidenceContext
  planned: {
    blocks: FinalReportPlannedBlock[]
  }
  executed: {
    sessions: TeachingSessionRecord[]
    allocations: TeachingSessionAllocationRecord[]
    totalActualMinutes: number
    supersededSessionCount: number
    unallocatedSessions: TeachingSessionRecord[]
  }
  observed: {
    observations: TeachingObservation[]
    evidenceReferences: TeachingEvidenceReference[]
  }
  materialUsageReceipts: unknown[]
  institutionalSources: FinalReportInstitutionalSources
  humanRequired: string[]
  missingInformation: string[]
  internalProvenance: {
    sessionIds: string[]
    allocationIds: string[]
  }
  evidenceFreshness: string
  consistencyFindings: FinalReportConsistencyFinding[]
}

export function composeFinalReportEvidenceBundle(input: FinalReportEvidenceInput): FinalReportEvidenceBundle {
  const currentSessions = currentTeachingSessions(input.teachingSessions)
  const currentSessionIds = new Set(currentSessions.map((session) => session.id))
  const currentAllocations = input.teachingSessions.allocations.filter((allocation) => currentSessionIds.has(allocation.sessionId))
  const allocatedSessionIds = new Set(currentAllocations.map((allocation) => allocation.sessionId))
  const allocatedBlockIds = new Set(currentAllocations.map((allocation) => allocation.blockId))
  const plannedByBlock = new Map(input.plannedBlocks.map((block) => [block.blockId, block]))
  const consistencyFindings: FinalReportConsistencyFinding[] = []

  for (const block of input.plannedBlocks) {
    if (block.state === 'SVOLTO' && !allocatedBlockIds.has(block.blockId)) {
      consistencyFindings.push({ code: 'PLAN_BLOCK_WITHOUT_SESSION', blockId: block.blockId })
    }
    if (block.state === 'RIMODULATO') consistencyFindings.push({ code: 'REMAPPED_BLOCK', blockId: block.blockId })
    if (block.state === 'RECUPERATO') consistencyFindings.push({ code: 'RECOVERED_BLOCK', blockId: block.blockId })
    if (block.state === 'ANNULLATO') consistencyFindings.push({ code: 'CANCELLED_BLOCK', blockId: block.blockId })
  }

  for (const allocation of currentAllocations) {
    if (plannedByBlock.get(allocation.blockId)?.state === 'PIANIFICATO') {
      consistencyFindings.push({
        code: 'SESSION_ON_PLANNED_BLOCK',
        blockId: allocation.blockId,
        sessionId: allocation.sessionId,
      })
    }
  }

  const unallocatedSessions = currentSessions.filter((session) => !allocatedSessionIds.has(session.id))
  for (const session of unallocatedSessions) {
    consistencyFindings.push({ code: 'UNALLOCATED_SESSION', sessionId: session.id })
  }

  const supersededSessionCount = input.teachingSessions.sessions.length - currentSessions.length

  return {
    context: { ...input.context },
    planned: {
      blocks: input.plannedBlocks.map((block) => ({ ...block })),
    },
    executed: {
      sessions: currentSessions.map((session) => ({ ...session, source: { ...session.source, provenance: [...session.source.provenance] } })),
      allocations: currentAllocations.map((allocation) => ({ ...allocation })),
      totalActualMinutes: currentSessions.reduce((total, session) => total + session.actualMinutes, 0),
      supersededSessionCount,
      unallocatedSessions: unallocatedSessions.map((session) => ({
        ...session,
        source: { ...session.source, provenance: [...session.source.provenance] },
      })),
    },
    observed: {
      observations: input.observations.map((observation) => ({ ...observation })),
      evidenceReferences: input.evidenceReferences.map((reference) => ({
        ...reference,
        observationIds: [...reference.observationIds],
      })),
    },
    materialUsageReceipts: [...input.materialUsageReceipts],
    institutionalSources: { ...input.institutionalSources },
    humanRequired: [...input.humanRequired],
    missingInformation: [...input.humanRequired],
    internalProvenance: {
      sessionIds: currentSessions.map((session) => session.id).sort(),
      allocationIds: currentAllocations.map((allocation) => allocation.id).sort(),
    },
    evidenceFreshness: input.evidenceFreshness,
    consistencyFindings,
  }
}

export function deriveFinalReportReadiness(bundle: FinalReportEvidenceBundle): {
  state: FinalReportReadiness
  missing: string[]
  findings: FinalReportConsistencyFinding[]
} {
  const findings = [...bundle.consistencyFindings]
  const missing = [...bundle.missingInformation]

  if (!bundle.context.disciplineId?.trim()) {
    findings.push({ code: 'MISSING_DISCIPLINE_CONTEXT' })
    missing.push('Disciplina non disponibile')
  }
  if (!bundle.institutionalSources.hasActiveInstitutionalBase) {
    findings.push({ code: 'MISSING_ACTIVE_INSTITUTIONAL_BASE' })
    missing.push('Veste istituzionale attiva non disponibile')
  }
  if (!bundle.institutionalSources.hasActiveFinalReportTemplate) {
    findings.push({ code: 'MISSING_ACTIVE_TEMPLATE' })
    missing.push('Modello attivo per la relazione finale non disponibile')
  }

  const uniqueMissing = [...new Set(missing)]
  const uniqueFindings = dedupeFindings(findings)
  const blockingCodes = new Set<FinalReportConsistencyCode>([
    'MISSING_ACTIVE_INSTITUTIONAL_BASE',
    'MISSING_ACTIVE_TEMPLATE',
    'MISSING_DISCIPLINE_CONTEXT',
  ])

  if (
    uniqueFindings.some((finding) => blockingCodes.has(finding.code))
    || (bundle.planned.blocks.length === 0 && bundle.executed.sessions.length === 0)
  ) {
    return { state: 'DATI_INSUFFICIENTI', missing: uniqueMissing, findings: uniqueFindings }
  }

  const integrationCodes = new Set<FinalReportConsistencyCode>([
    'PLAN_BLOCK_WITHOUT_SESSION',
    'SESSION_ON_PLANNED_BLOCK',
  ])
  if (uniqueFindings.some((finding) => integrationCodes.has(finding.code))) {
    return { state: 'RICHIEDE_INTEGRAZIONI', missing: uniqueMissing, findings: uniqueFindings }
  }

  if (uniqueMissing.length > 0) {
    return { state: 'PRONTA_PER_BOZZA', missing: uniqueMissing, findings: uniqueFindings }
  }

  return { state: 'PRONTA_PER_REVISIONE', missing: [], findings: uniqueFindings }
}

function dedupeFindings(findings: FinalReportConsistencyFinding[]) {
  const seen = new Set<string>()
  return findings.filter((finding) => {
    const key = `${finding.code}:${finding.blockId ?? ''}:${finding.sessionId ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
