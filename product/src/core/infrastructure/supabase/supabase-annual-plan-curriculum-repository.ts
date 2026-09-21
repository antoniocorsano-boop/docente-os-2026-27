import 'server-only'

import { asAnnualPlanGrade } from '@/core/domain/annual-plan-execution'
import {
  assertEco02PilotCurriculumIntakeScope,
  assertUploadedArenaAuthorityContextAllowed,
  bindArenaDisciplineRefToDocenteOs,
} from '@/core/domain/cml-discipline-binding'
import type { TransitionAwareAnnualPlanApplyCommand } from '@/core/domain/cml-curriculum-applicability'
import {
  prepareAnnualPlanCurriculumPersistence,
  type AnnualPlanCurriculumPersistencePayload,
} from '@/core/domain/cml-annual-plan-curriculum-persistence'
import type { AnnualPlanCurriculumBaselineSnapshot } from '@/core/domain/cml-curriculum-revalidation'
import { validateCurriculumContextForClassV1 } from '@/core/domain/cml-local-handoff-v2'
import { eco02PilotIdentityFromEnv } from '@/core/server/eco02-pilot-config'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type AnnualPlanCurriculumAdoptionReceipt = {
  id: string
  sectionId: string
  curricularContextId: string
  schoolYearRef: string
  disciplineRef: string
  gradeRef: string
  curriculumState: 'PROVISIONAL_COMPLETE' | 'APPROVED'
  alignmentAuthority: 'PROVISIONAL_BASELINE' | 'APPROVED_INSTITUTIONAL'
  requiresRevalidationOnApproval: boolean
  applicabilityStatus: 'APPLICABLE' | 'TRANSITIONAL'
  transitionRemodulationState: 'NOT_REQUIRED' | 'HYPOTHESIS' | 'APPROVED'
  sourceHandoffFootprintHash: string
  sourceFrameworkMessageId: string
  acceptanceDecisionId: string
  acceptedAt: string
  appliedAt: string
}

type RpcError = { message: string }
type CurriculumRpcClient = {
  rpc: (
    name: 'annual_plan_curriculum_current',
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>
}

type RawReceipt = {
  id: string
  section_id: string
  curricular_context_id: string
  school_year_ref: string
  discipline_ref: string
  grade_ref: string
  curriculum_state: string
  alignment_authority: string
  requires_revalidation_on_approval: boolean
  applicability_status: string
  transition_remodulation_state: string
  source_handoff_footprint_hash: string
  source_framework_message_id: string
  acceptance_decision_id: string
  accepted_at: string
  applied_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`Invalid curriculum adoption receipt: ${field}`)
  return value
}

function rawReceipt(value: unknown): RawReceipt {
  if (!isRecord(value)) throw new Error('Invalid curriculum adoption receipt')
  const curriculumState = requiredString(value.curriculum_state, 'curriculum_state')
  const alignmentAuthority = requiredString(value.alignment_authority, 'alignment_authority')
  const applicabilityStatus = requiredString(value.applicability_status, 'applicability_status')
  const transitionState = requiredString(value.transition_remodulation_state, 'transition_remodulation_state')
  if (curriculumState !== 'PROVISIONAL_COMPLETE' && curriculumState !== 'APPROVED') throw new Error('Invalid curriculum adoption receipt: curriculum_state')
  if (alignmentAuthority !== 'PROVISIONAL_BASELINE' && alignmentAuthority !== 'APPROVED_INSTITUTIONAL') throw new Error('Invalid curriculum adoption receipt: alignment_authority')
  if (applicabilityStatus !== 'APPLICABLE' && applicabilityStatus !== 'TRANSITIONAL') throw new Error('Invalid curriculum adoption receipt: applicability_status')
  if (!['NOT_REQUIRED', 'HYPOTHESIS', 'APPROVED'].includes(transitionState)) throw new Error('Invalid curriculum adoption receipt: transition_remodulation_state')
  if (typeof value.requires_revalidation_on_approval !== 'boolean') throw new Error('Invalid curriculum adoption receipt: requires_revalidation_on_approval')
  return {
    id: requiredString(value.id, 'id'),
    section_id: requiredString(value.section_id, 'section_id'),
    curricular_context_id: requiredString(value.curricular_context_id, 'curricular_context_id'),
    school_year_ref: requiredString(value.school_year_ref, 'school_year_ref'),
    discipline_ref: requiredString(value.discipline_ref, 'discipline_ref'),
    grade_ref: requiredString(value.grade_ref, 'grade_ref'),
    curriculum_state: curriculumState,
    alignment_authority: alignmentAuthority,
    requires_revalidation_on_approval: value.requires_revalidation_on_approval,
    applicability_status: applicabilityStatus,
    transition_remodulation_state: transitionState,
    source_handoff_footprint_hash: requiredString(value.source_handoff_footprint_hash, 'source_handoff_footprint_hash'),
    source_framework_message_id: requiredString(value.source_framework_message_id, 'source_framework_message_id'),
    acceptance_decision_id: requiredString(value.acceptance_decision_id, 'acceptance_decision_id'),
    accepted_at: requiredString(value.accepted_at, 'accepted_at'),
    applied_at: requiredString(value.applied_at, 'applied_at'),
  }
}

function toReceipt(value: unknown): AnnualPlanCurriculumAdoptionReceipt {
  const row = rawReceipt(value)
  return {
    id: row.id,
    sectionId: row.section_id,
    curricularContextId: row.curricular_context_id,
    schoolYearRef: row.school_year_ref,
    disciplineRef: row.discipline_ref,
    gradeRef: row.grade_ref,
    curriculumState: row.curriculum_state as AnnualPlanCurriculumAdoptionReceipt['curriculumState'],
    alignmentAuthority: row.alignment_authority as AnnualPlanCurriculumAdoptionReceipt['alignmentAuthority'],
    requiresRevalidationOnApproval: row.requires_revalidation_on_approval,
    applicabilityStatus: row.applicability_status as AnnualPlanCurriculumAdoptionReceipt['applicabilityStatus'],
    transitionRemodulationState: row.transition_remodulation_state as AnnualPlanCurriculumAdoptionReceipt['transitionRemodulationState'],
    sourceHandoffFootprintHash: row.source_handoff_footprint_hash,
    sourceFrameworkMessageId: row.source_framework_message_id,
    acceptanceDecisionId: row.acceptance_decision_id,
    acceptedAt: row.accepted_at,
    appliedAt: row.applied_at,
  }
}

function toBaselineSnapshot(value: unknown): AnnualPlanCurriculumBaselineSnapshot {
  if (!isRecord(value)) throw new Error('Invalid curriculum adoption baseline')
  const receipt = toReceipt(value)
  const contextValidation = validateCurriculumContextForClassV1(value.curricular_context)
  if (!contextValidation.valid) {
    throw new Error(`Invalid persisted curricular context: ${contextValidation.errors.join('; ')}`)
  }
  if (!isRecord(value.reviewed_framework)
    || !Array.isArray(value.reviewed_framework.periods)
    || !Array.isArray(value.reviewed_framework.constraints)) {
    throw new Error('Invalid persisted reviewed framework')
  }
  if (!isRecord(value.curriculum_coverage)
    || !['SATISFIED', 'PARTIALLY_SATISFIED', 'NOT_SATISFIED'].includes(String(value.curriculum_coverage.status))
    || !['PROVISIONAL_BASELINE', 'APPROVED_INSTITUTIONAL'].includes(String(value.curriculum_coverage.authority))
    || typeof value.curriculum_coverage.requiresRevalidationOnApproval !== 'boolean'
    || !Array.isArray(value.curriculum_coverage.requirementCoverage)
    || !Array.isArray(value.curriculum_coverage.blockingRequirementIds)) {
    throw new Error('Invalid persisted curriculum coverage')
  }

  return {
    id: receipt.id,
    sectionId: receipt.sectionId,
    curricularContextId: receipt.curricularContextId,
    schoolYearRef: receipt.schoolYearRef,
    disciplineRef: receipt.disciplineRef,
    gradeRef: receipt.gradeRef,
    curriculumState: receipt.curriculumState,
    alignmentAuthority: receipt.alignmentAuthority,
    requiresRevalidationOnApproval: receipt.requiresRevalidationOnApproval,
    sourceHandoffFootprintHash: receipt.sourceHandoffFootprintHash,
    sourceFrameworkMessageId: receipt.sourceFrameworkMessageId,
    acceptanceDecisionId: receipt.acceptanceDecisionId,
    acceptedAt: receipt.acceptedAt,
    reviewedFramework: value.reviewed_framework as AnnualPlanCurriculumBaselineSnapshot['reviewedFramework'],
    curriculumCoverage: value.curriculum_coverage as AnnualPlanCurriculumBaselineSnapshot['curriculumCoverage'],
    curricularContext: value.curricular_context as AnnualPlanCurriculumBaselineSnapshot['curricularContext'],
  }
}

export class SupabaseAnnualPlanCurriculumRepository {
  async persist(input: {
    workspaceId: string
    academicYearId: string
    sectionId: string
    command: TransitionAwareAnnualPlanApplyCommand
  }): Promise<AnnualPlanCurriculumAdoptionReceipt> {
    const supabase = await createClient()
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    const actorId = claimsData?.claims?.sub
    if (claimsError || !actorId) throw new Error('authenticated user required')

    const { data: section, error: sectionError } = await supabase
      .from('annual_plan_sections')
      .select('id,grade,section_code')
      .eq('id', input.sectionId)
      .eq('workspace_id', input.workspaceId)
      .eq('academic_year_id', input.academicYearId)
      .maybeSingle()
    if (sectionError) throw new Error(sectionError.message)
    if (!section) throw new Error('Annual plan section is outside the active workspace/year')

    const { data: academicYear, error: yearError } = await supabase
      .from('academic_years')
      .select('label')
      .eq('id', input.academicYearId)
      .eq('workspace_id', input.workspaceId)
      .maybeSingle()
    if (yearError) throw new Error(yearError.message)
    if (!academicYear) throw new Error('Annual plan academic year is outside the active workspace')

    assertEco02PilotCurriculumIntakeScope({
      workspaceId: input.workspaceId,
      academicYearId: input.academicYearId,
      sectionId: input.sectionId,
      grade: asAnnualPlanGrade(section.grade),
      sectionCode: section.section_code,
      disciplineRef: input.command.curricularContext.disciplineRef,
    }, eco02PilotIdentityFromEnv())
    assertUploadedArenaAuthorityContextAllowed(input.command.curricularContext)

    const payload = prepareAnnualPlanCurriculumPersistence({
      command: input.command,
      section: {
        sectionId: section.id,
        academicYearLabel: academicYear.label,
        grade: asAnnualPlanGrade(section.grade),
        sectionCode: section.section_code,
      },
    })

    if (payload.curriculumState !== 'PROVISIONAL_COMPLETE'
      || payload.alignmentAuthority !== 'PROVISIONAL_BASELINE'
      || payload.requiresRevalidationOnApproval !== true
      || payload.transitionRemodulationState === 'APPROVED') {
      throw new Error('local curriculum intake cannot establish institutional approval authority')
    }

    const admin = createAdminClient()
    const { data: membership, error: membershipError } = await admin
      .from('workspace_memberships')
      .select('workspace_id,user_id')
      .eq('workspace_id', input.workspaceId)
      .eq('user_id', actorId)
      .maybeSingle()
    if (membershipError) throw new Error(membershipError.message)
    if (!membership) throw new Error('workspace membership required')

    const row = {
      section_id: payload.sectionId,
      curricular_context_id: payload.curricularContextId,
      school_year_ref: payload.schoolYearRef,
      discipline_ref: payload.disciplineRef,
      grade_ref: payload.gradeRef,
      section_ref: payload.sectionRef,
      cohort_ref: payload.cohortRef,
      curriculum_version_ref: payload.curriculumVersionRef,
      curriculum_state: payload.curriculumState,
      alignment_authority: payload.alignmentAuthority,
      requires_revalidation_on_approval: payload.requiresRevalidationOnApproval,
      applicability_status: payload.applicabilityStatus,
      transition_remodulation_state: payload.transitionRemodulationState,
      source_handoff_footprint_hash: payload.sourceHandoffFootprintHash,
      source_framework_message_id: payload.sourceFrameworkMessageId,
      acceptance_decision_id: payload.acceptanceDecisionId,
      accepted_at: payload.acceptedAt,
      reviewed_framework: payload.reviewedFramework,
      curriculum_coverage: payload.curriculumCoverage,
      curricular_context: payload.curricularContext,
      applied_by: actorId,
    }

    const { data: inserted, error: insertError } = await admin
      .from('annual_plan_curriculum_adoptions')
      .insert(row)
      .select('*')
      .maybeSingle()

    if (!insertError && inserted) return toReceipt(inserted)
    if (insertError && insertError.code !== '23505') throw new Error(insertError.message)

    const { data: existing, error: existingError } = await admin
      .from('annual_plan_curriculum_adoptions')
      .select('*')
      .eq('section_id', payload.sectionId)
      .eq('discipline_ref', payload.disciplineRef)
      .eq('source_handoff_footprint_hash', payload.sourceHandoffFootprintHash)
      .is('authority_quarantined_at', null)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (!existing) throw new Error('annual plan curriculum adoption receipt was not persisted')

    const receipt = toReceipt(existing)
    if (receipt.curricularContextId !== payload.curricularContextId
      || receipt.sourceFrameworkMessageId !== payload.sourceFrameworkMessageId) {
      throw new Error('idempotency conflict for curriculum adoption fingerprint')
    }
    return receipt
  }

  async current(input: {
    workspaceId: string
    academicYearId: string
    sectionId: string
    disciplineRef: string
  }): Promise<AnnualPlanCurriculumAdoptionReceipt | null> {
    const supabase = await createClient()
    const rpc = supabase as unknown as CurriculumRpcClient
    const { data, error } = await rpc.rpc('annual_plan_curriculum_current', {
      target_workspace_id: input.workspaceId,
      target_academic_year_id: input.academicYearId,
      target_section_id: input.sectionId,
      target_discipline_ref: bindArenaDisciplineRefToDocenteOs(input.disciplineRef),
    })
    if (error) throw new Error(error.message)
    return data === null ? null : toReceipt(data)
  }

  async currentBaseline(input: {
    workspaceId: string
    academicYearId: string
    sectionId: string
    disciplineRef: string
  }): Promise<AnnualPlanCurriculumBaselineSnapshot | null> {
    const supabase = await createClient()
    const rpc = supabase as unknown as CurriculumRpcClient
    const { data, error } = await rpc.rpc('annual_plan_curriculum_current', {
      target_workspace_id: input.workspaceId,
      target_academic_year_id: input.academicYearId,
      target_section_id: input.sectionId,
      target_discipline_ref: bindArenaDisciplineRefToDocenteOs(input.disciplineRef),
    })
    if (error) throw new Error(error.message)
    return data === null ? null : toBaselineSnapshot(data)
  }
}
