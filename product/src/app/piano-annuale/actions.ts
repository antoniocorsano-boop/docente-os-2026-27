'use server'

import { revalidatePath } from 'next/cache'
import { asAnnualPlanBlockStatus } from '@/core/domain/annual-plan-execution'
import {
  buildCurriculumFeedbackPreview,
  submitCurriculumFeedback,
  type CurriculumFeedbackCategory,
  type CurriculumFeedbackDraft,
} from '@/core/domain/cml-curriculum-feedback'
import type { CmlCanonicalRef } from '@/core/domain/cml-local-handoff'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCurriculumFeedbackRelayRepository } from '@/core/infrastructure/supabase/supabase-curriculum-feedback-relay-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_STORAGE, type GradeKey } from './model'

export async function addAnnualPlanSection(gradeValue: string, sectionCode: string) {
  const grade = asGradeKey(gradeValue)
  const context = await requireContext()
  const repository = new SupabaseAnnualPlanExecutionRepository()
  const section = await repository.addSection(
    context.workspace.id,
    context.academicYear.id,
    GRADE_STORAGE[grade],
    sectionCode,
  )
  revalidatePath('/piano-annuale')
  return section
}

export async function confirmAnnualPlanSection(sectionId: string) {
  if (!sectionId) throw new Error('Section id required')
  const context = await requireContext()
  const repository = new SupabaseAnnualPlanExecutionRepository()
  const section = await repository.setSectionStatus(
    context.workspace.id,
    context.academicYear.id,
    sectionId,
    'CONFERMATA',
  )
  revalidatePath('/piano-annuale')
  return section
}

export async function saveAnnualPlanProgress(input: {
  grade: string
  sectionId: string
  blockId: string
  status: string
  date: string
  note: string
}) {
  const grade = asGradeKey(input.grade)
  const status = asAnnualPlanBlockStatus(input.status)
  const block = buildBlocks(grade).find((item) => item.id === input.blockId)
  if (!block) throw new Error('Block is outside the canonical annual plan')
  if (!input.sectionId) throw new Error('Section id required')

  const context = await requireContext()
  const source = CANONICAL_PLAN_SOURCES[grade]
  const repository = new SupabaseAnnualPlanExecutionRepository()
  const progress = await repository.saveProgress({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: input.sectionId,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
    blockId: block.id,
    status,
    executedOn: normalizeDate(input.date),
    evidenceNote: normalizeNote(input.note),
  })
  revalidatePath('/piano-annuale')
  return progress
}

export async function resetAnnualPlanProgress(gradeValue: string, sectionId: string) {
  const grade = asGradeKey(gradeValue)
  if (!sectionId) throw new Error('Section id required')
  const context = await requireContext()
  const repository = new SupabaseAnnualPlanExecutionRepository()
  await repository.resetProgress(
    context.workspace.id,
    context.academicYear.id,
    sectionId,
    CANONICAL_PLAN_SOURCES[grade].generationId,
  )
  revalidatePath('/piano-annuale')
}

export async function getCurriculumFeedbackRelayContext(sectionId: string) {
  if (!sectionId) throw new Error('Seleziona una sezione prima di condividere un’osservazione')
  const context = await requireContext()
  const repository = new SupabaseCurriculumFeedbackRelayRepository()
  const baseline = await repository.currentBaseline({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
  })
  if (!baseline) {
    return {
      available: false as const,
      reason: 'Per questa sezione non c’è ancora un quadro curricolare accettato da CurManLight Arena.',
    }
  }
  return {
    available: true as const,
    curricularContextId: baseline.curricularContextId,
    disciplineRef: baseline.disciplineRef,
    curriculumState: baseline.curricularContext.curriculumState,
    acceptedAt: baseline.acceptedAt,
    nodes: baseline.curricularContext.requirements.map((requirement) => ({
      requirementId: requirement.requirementId,
      description: requirement.description,
      authorityLevel: requirement.authorityLevel,
      curriculumNodeRef: requirement.curriculumNodeRef,
    })),
  }
}

export async function previewCurriculumFeedbackRelay(input: CurriculumFeedbackRelayInput) {
  const { baseline, requirement } = await requireFeedbackBaseline(input.sectionId, input.requirementId)
  const draft = feedbackDraft(input, baseline, requirement.curriculumNodeRef, new Date().toISOString())
  return buildCurriculumFeedbackPreview(draft)
}

export async function confirmAndExportCurriculumFeedbackRelay(input: CurriculumFeedbackRelayInput & {
  privacyConfirmed: boolean
}) {
  if (input.privacyConfirmed !== true) throw new Error('Conferma che l’osservazione non contiene dati personali degli studenti')
  const context = await requireContext()
  const repository = new SupabaseCurriculumFeedbackRelayRepository()
  const baseline = await repository.currentBaseline({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: input.sectionId,
  })
  if (!baseline) throw new Error('Il quadro curricolare accettato non è più disponibile')
  const requirement = baseline.curricularContext.requirements.find((item) => item.requirementId === input.requirementId)
  if (!requirement) throw new Error('Il riferimento curricolare scelto non appartiene più al quadro accettato')

  const submittedAt = new Date().toISOString()
  const draft = feedbackDraft(input, baseline, requirement.curriculumNodeRef, submittedAt)
  const submission = submitCurriculumFeedback({ draft, teacherConfirmed: true })
  const receipt = await repository.persistSubmission({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: input.sectionId,
    baseline,
    category: input.category,
    submission,
  })

  return {
    status: 'READY_FOR_LOCAL_EXPORT' as const,
    receipt,
    envelope: submission.envelope,
    filename: `curmanlight-feedback-${submittedAt.slice(0, 10)}-${safeFileToken(input.feedbackId)}.json`,
    note: 'Il file è pronto sul dispositivo. Non è stato inviato automaticamente a CurManLight Arena.',
  }
}

type CurriculumFeedbackRelayInput = {
  sectionId: string
  feedbackId: string
  category: CurriculumFeedbackCategory
  requirementId: string
  summary: string
}

type FeedbackBaseline = Awaited<ReturnType<SupabaseCurriculumFeedbackRelayRepository['currentBaseline']>>
type PresentFeedbackBaseline = Exclude<FeedbackBaseline, null>

async function requireFeedbackBaseline(sectionId: string, requirementId: string) {
  const context = await requireContext()
  const repository = new SupabaseCurriculumFeedbackRelayRepository()
  const baseline = await repository.currentBaseline({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId,
  })
  if (!baseline) throw new Error('Per questa sezione non c’è un quadro curricolare accettato da CurManLight Arena')
  const requirement = baseline.curricularContext.requirements.find((item) => item.requirementId === requirementId)
  if (!requirement) throw new Error('Scegli un riferimento curricolare del quadro accettato')
  return { baseline, requirement }
}

function feedbackDraft(
  input: CurriculumFeedbackRelayInput,
  baseline: PresentFeedbackBaseline,
  alignedNodeRef: CmlCanonicalRef,
  submittedAt: string,
): CurriculumFeedbackDraft {
  const feedbackId = input.feedbackId.trim()
  if (!/^feedback-[0-9a-f-]{36}$/i.test(feedbackId)) throw new Error('Identificativo locale del feedback non valido')
  return {
    feedbackId,
    sourceVersion: process.env.RENDER_GIT_COMMIT ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'DOCENTE_OS_2026_27',
    submittedAt,
    baseline: {
      curricularContextId: baseline.curricularContextId,
      curriculumVersionRef: baseline.curriculumVersionRef,
      sourceHandoffFootprintHash: baseline.sourceHandoffFootprintHash,
      sourceFrameworkMessageId: baseline.sourceFrameworkMessageId,
    },
    category: input.category,
    alignedNodeRefs: [alignedNodeRef],
    evidenceRefs: [{
      namespace: 'docente.os',
      entityType: 'AnnualPlanCurriculumAdoption',
      entityId: baseline.adoptionReceiptId,
    }],
    summary: input.summary,
    privacyAttestation: 'NO_STUDENT_PERSONAL_DATA',
  }
}

async function requireContext() {
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) throw new Error('Authenticated workspace required')
  if (!context.academicYear) throw new Error('Active academic year required')
  return { ...context, academicYear: context.academicYear }
}

function asGradeKey(value: string): GradeKey {
  if (value === 'Prima' || value === 'Seconda' || value === 'Terza') return value
  throw new Error(`Unsupported annual plan grade: ${value}`)
}

function normalizeDate(value: string) {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid execution date')
  return value
}

function normalizeNote(value: string) {
  const note = value.trim()
  if (!note) return null
  if (note.length > 4000) throw new Error('Evidence note exceeds 4000 characters')
  return note
}

function safeFileToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(-44)
}
