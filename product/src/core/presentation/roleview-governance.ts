import type {
  LessonPreparationManifest,
  LessonPreparationManifestResult,
  LessonPreparationReadiness,
} from './lesson-preparation-manifest'

export type RoleViewRole = 'TEACHER' | 'COORDINATOR' | 'REVIEWER' | 'DEVELOPER'

export type RoleViewStatus = 'READY' | 'ATTENTION' | 'BLOCKED'
export type RoleViewGateStatus = 'PASS' | 'WARN' | 'BLOCKED' | 'NOT_APPLICABLE'
export type RoleViewMaturityState = 'NOT_ASSESSED' | 'IN_PROGRESS' | 'READY' | 'BLOCKED'

export type RoleViewScope = {
  kind: string
  id: string
  label?: string
}

export type RoleViewMaturityDimension = {
  id: string
  label: string
  state: RoleViewMaturityState
  score?: number
  source: string
}

export type RoleViewGate = {
  id: string
  label: string
  status: RoleViewGateStatus
  reason?: string
  source: string
}

export type RoleViewKpi = {
  id: string
  label: string
  value: number
  unit: 'count' | 'ratio' | 'percent' | 'minutes' | 'boolean'
  target?: number
  source: string
}

export type RoleViewBlocker = {
  code: string
  label: string
  source: string
}

export type RoleViewAction = {
  id: string
  label: string
  priority: 'PRIMARY' | 'SECONDARY'
  source: string
  href?: string
}

export type RoleViewEvidence = {
  kind: string
  ref?: string
  label?: string
}

export type RoleViewSnapshot = {
  schemaVersion: 'roleview.v0'
  product: 'DOCENTE_OS'
  scope: RoleViewScope
  role: RoleViewRole
  focus: string
  stage: string
  status: RoleViewStatus
  headline: string
  maturity: RoleViewMaturityDimension[]
  gates: RoleViewGate[]
  kpis: RoleViewKpi[]
  blockers: RoleViewBlocker[]
  nextActions: RoleViewAction[]
  evidence: RoleViewEvidence[]
  provenance: RoleViewEvidence[]
}

export function buildLessonPreparationRoleView(
  result: LessonPreparationManifestResult,
  role: RoleViewRole = 'TEACHER',
): RoleViewSnapshot {
  if (result.resolution === 'BLOCKED') {
    const blockers = uniqueStrings(result.reasons)

    return {
      schemaVersion: 'roleview.v0',
      product: 'DOCENTE_OS',
      scope: {
        kind: 'LESSON_PREPARATION',
        id: 'unresolved',
      },
      role,
      focus: focusForRole(role),
      stage: 'PREPARE_LESSON',
      status: 'BLOCKED',
      headline: 'Preparazione della lezione bloccata',
      maturity: [
        maturity('CANONICAL_BINDING', 'Collegamento canonico', 'BLOCKED', 'LessonPreparationManifestResult.resolution'),
        maturity('MATERIAL_READINESS', 'Materiali', 'NOT_ASSESSED', 'LessonPreparationManifestResult.resolution'),
        maturity('HUMAN_VALIDATION', 'Validazione umana', 'NOT_ASSESSED', 'LessonPreparationManifestResult.resolution'),
        maturity('EVIDENCE_PROVENANCE', 'Evidenze e provenienza', 'NOT_ASSESSED', 'LessonPreparationManifestResult.resolution'),
      ],
      gates: [
        {
          id: 'LESSON_PREPARATION_READY',
          label: 'Preparazione pronta',
          status: 'BLOCKED',
          reason: blockers.join('; '),
          source: 'LessonPreparationManifestResult',
        },
      ],
      kpis: [
        {
          id: 'blocking_reasons',
          label: 'Cause bloccanti',
          value: blockers.length,
          unit: 'count',
          target: 0,
          source: 'LessonPreparationManifestResult.reasons',
        },
      ],
      blockers: blockers.map((reason) => ({
        code: reason,
        label: reason,
        source: 'LessonPreparationManifestResult.reasons',
      })),
      nextActions: [
        {
          id: 'RESOLVE_LESSON_PREPARATION_BINDING',
          label: actionLabelForRole(role, 'BLOCKED'),
          priority: 'PRIMARY',
          source: 'LessonPreparationManifestResult.resolution',
        },
      ],
      evidence: [],
      provenance: [],
    }
  }

  return snapshotFromManifest(result.manifest, role)
}

function snapshotFromManifest(manifest: LessonPreparationManifest, role: RoleViewRole): RoleViewSnapshot {
  const requiredSlots = manifest.materialSlots.filter((slot) => slot.required)
  const readySlots = requiredSlots.filter((slot) => slot.status === 'READY')
  const missingSlots = requiredSlots.filter((slot) => slot.status === 'MISSING')
  const reviewSlots = manifest.materialSlots.filter(
    (slot) => slot.status === 'PROPOSED' || slot.status === 'NEEDS_REVIEW',
  )
  const missingInformation = uniqueStrings(manifest.missingInformation)
  const blockers = blockersForManifest(manifest, missingSlots.map((slot) => slot.role), missingInformation)
  const status = statusForReadiness(manifest.readiness)
  const gateStatus = gateForReadiness(manifest.readiness)
  const evidence = manifest.provenance.map((item) => ({ ...item }))

  return {
    schemaVersion: 'roleview.v0',
    product: 'DOCENTE_OS',
    scope: {
      kind: 'LESSON_PREPARATION',
      id: manifest.lessonRef,
      label: manifest.objective,
    },
    role,
    focus: focusForRole(role),
    stage: 'PREPARE_LESSON',
    status,
    headline: headlineForReadiness(manifest.readiness),
    maturity: [
      maturity('CANONICAL_BINDING', 'Collegamento canonico', 'READY', 'LessonPreparationManifest'),
      maturity(
        'MATERIAL_READINESS',
        'Materiali',
        missingSlots.length === 0 && reviewSlots.length === 0 ? 'READY' : 'IN_PROGRESS',
        'LessonPreparationManifest.materialSlots',
      ),
      maturity(
        'HUMAN_VALIDATION',
        'Validazione umana',
        humanValidationMaturity(manifest.readiness),
        'LessonPreparationManifest.readiness',
      ),
      maturity(
        'EVIDENCE_PROVENANCE',
        'Evidenze e provenienza',
        evidence.length > 0 ? 'READY' : 'NOT_ASSESSED',
        'LessonPreparationManifest.provenance',
      ),
    ],
    gates: [
      {
        id: 'LESSON_PREPARATION_READY',
        label: 'Preparazione pronta',
        status: gateStatus,
        reason: blockers.length ? blockers.map((item) => item.label).join('; ') : undefined,
        source: 'LessonPreparationManifest.readiness',
      },
    ],
    kpis: [
      {
        id: 'required_materials',
        label: 'Materiali richiesti',
        value: requiredSlots.length,
        unit: 'count',
        source: 'LessonPreparationManifest.materialSlots[required=true]',
      },
      {
        id: 'ready_required_materials',
        label: 'Materiali richiesti pronti',
        value: readySlots.length,
        unit: 'count',
        target: requiredSlots.length,
        source: 'LessonPreparationManifest.materialSlots[required=true,status=READY]',
      },
      {
        id: 'missing_required_materials',
        label: 'Materiali richiesti mancanti',
        value: missingSlots.length,
        unit: 'count',
        target: 0,
        source: 'LessonPreparationManifest.materialSlots[required=true,status=MISSING]',
      },
      {
        id: 'materials_requiring_review',
        label: 'Materiali da rivedere',
        value: reviewSlots.length,
        unit: 'count',
        target: 0,
        source: 'LessonPreparationManifest.materialSlots[status=PROPOSED|NEEDS_REVIEW]',
      },
      {
        id: 'provenance_items',
        label: 'Riferimenti di provenienza',
        value: evidence.length,
        unit: 'count',
        source: 'LessonPreparationManifest.provenance',
      },
    ],
    blockers,
    nextActions: nextActionsForManifest(manifest, role),
    evidence,
    provenance: evidence.map((item) => ({ ...item })),
  }
}

function maturity(
  id: string,
  label: string,
  state: RoleViewMaturityState,
  source: string,
): RoleViewMaturityDimension {
  return { id, label, state, source }
}

function blockersForManifest(
  manifest: LessonPreparationManifest,
  missingRoles: string[],
  missingInformation: string[],
): RoleViewBlocker[] {
  const blockers: RoleViewBlocker[] = missingInformation.map((label) => ({
    code: label,
    label,
    source: 'LessonPreparationManifest.missingInformation',
  }))

  for (const role of missingRoles) {
    const code = `MISSING_MATERIAL:${role}`
    if (!blockers.some((blocker) => blocker.code === code || blocker.label.includes(role))) {
      blockers.push({
        code,
        label: `Materiale richiesto non disponibile: ${role}`,
        source: 'LessonPreparationManifest.materialSlots',
      })
    }
  }

  if (manifest.readiness === 'NEEDS_REVISION') {
    blockers.push({
      code: 'LESSON_PREPARATION_NEEDS_REVISION',
      label: 'La preparazione richiede revisione',
      source: 'LessonPreparationManifest.readiness',
    })
  }

  return blockers
}

function nextActionsForManifest(manifest: LessonPreparationManifest, role: RoleViewRole): RoleViewAction[] {
  if (manifest.readiness === 'READY' || manifest.readiness === 'USED') {
    return [{
      id: 'OPEN_LESSON',
      label: role === 'TEACHER' ? 'Apri la lezione' : 'Verifica la preparazione pronta',
      priority: 'PRIMARY',
      source: 'LessonPreparationManifest.readiness',
    }]
  }

  if (manifest.readiness === 'REVIEW_REQUIRED' || manifest.readiness === 'NEEDS_REVISION') {
    const canReviewProposals = role === 'TEACHER' && manifest.proposedExtensionRefs.length > 0
    return [{
      id: 'REVIEW_LESSON_PREPARATION',
      label: canReviewProposals
        ? 'Controlla proposte'
        : role === 'TEACHER'
          ? 'Rivedi e valida la preparazione'
          : 'Verifica gli elementi da validare',
      priority: 'PRIMARY',
      source: 'LessonPreparationManifest.readiness',
      href: canReviewProposals ? lessonDesignReviewHref(manifest) : undefined,
    }]
  }

  return [{
    id: 'COMPLETE_LESSON_PREPARATION',
    label: role === 'TEACHER' ? 'Completa ciò che manca' : 'Verifica gli elementi mancanti',
    priority: 'PRIMARY',
    source: 'LessonPreparationManifest.readiness',
  }]
}

function lessonDesignReviewHref(manifest: LessonPreparationManifest) {
  return `/classi/${encodeURIComponent(manifest.sectionId)}/lezioni/${encodeURIComponent(manifest.blockId)}?mode=prepare#lesson-design-tools-title`
}

function statusForReadiness(readiness: LessonPreparationReadiness): RoleViewStatus {
  return readiness === 'READY' || readiness === 'USED' ? 'READY' : 'ATTENTION'
}

function gateForReadiness(readiness: LessonPreparationReadiness): RoleViewGateStatus {
  return readiness === 'READY' || readiness === 'USED' ? 'PASS' : 'WARN'
}

function humanValidationMaturity(readiness: LessonPreparationReadiness): RoleViewMaturityState {
  if (readiness === 'READY' || readiness === 'USED') return 'READY'
  if (readiness === 'REVIEW_REQUIRED' || readiness === 'NEEDS_REVISION') return 'IN_PROGRESS'
  return 'NOT_ASSESSED'
}

function headlineForReadiness(readiness: LessonPreparationReadiness) {
  switch (readiness) {
    case 'READY':
      return 'Preparazione pronta per la lezione'
    case 'USED':
      return 'Preparazione utilizzata'
    case 'REVIEW_REQUIRED':
      return 'Preparazione da validare'
    case 'NEEDS_REVISION':
      return 'Preparazione da rivedere'
    case 'DRAFT':
      return 'Preparazione incompleta'
  }
}

function focusForRole(role: RoleViewRole) {
  switch (role) {
    case 'TEACHER':
      return 'Cosa serve per svolgere bene la prossima lezione'
    case 'COORDINATOR':
      return 'Completezza e avanzamento della preparazione'
    case 'REVIEWER':
      return 'Gate, evidenze e provenienza della preparazione'
    case 'DEVELOPER':
      return 'Coerenza del read model e cause dello stato'
  }
}

function actionLabelForRole(role: RoleViewRole, state: 'BLOCKED') {
  if (state !== 'BLOCKED') return 'Verifica lo stato'
  switch (role) {
    case 'TEACHER':
      return 'Risolvi le informazioni che bloccano la preparazione'
    case 'COORDINATOR':
      return 'Verifica la causa del blocco'
    case 'REVIEWER':
      return 'Verifica binding ed evidenze sorgente'
    case 'DEVELOPER':
      return 'Ispeziona la causa tecnica del blocco'
  }
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}
