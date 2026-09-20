'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { SupabaseAnnualPlanCurriculumRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-curriculum-repository'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  bindCurriculumContextAndCoverage,
  type AnnualPlanTargetScope,
} from '@/core/domain/cml-curriculum-applicability'
import {
  buildAnnualPlanFrameworkReviewDraftV2,
  prepareAnnualPlanFrameworkApplyV2,
  type TeacherFrameworkDecisionV2,
} from '@/core/domain/cml-handoff-v2-acceptance'
import { parseCmlLocalHandoffV2Json } from '@/core/domain/cml-local-handoff-v2'

export type CurriculumArenaIntakeActionState = {
  status: 'idle' | 'error'
  message: string | null
}

export const CURRICULUM_ARENA_INTAKE_INITIAL_STATE: CurriculumArenaIntakeActionState = {
  status: 'idle',
  message: null,
}

export async function acceptArenaCurriculumHandoff(
  _previous: CurriculumArenaIntakeActionState,
  formData: FormData,
): Promise<CurriculumArenaIntakeActionState> {
  const sectionId = String(formData.get('sectionId') ?? '').trim()
  const handoffJson = String(formData.get('handoffJson') ?? '').trim()
  if (!sectionId || !handoffJson) {
    return { status: 'error', message: 'Seleziona un passaggio Arena valido prima di confermare.' }
  }

  try {
    const handoff = parseCmlLocalHandoffV2Json(handoffJson)
    const context = await new SupabaseWorkspaceRepository().getCurrentContext()
    if (!context) return { status: 'error', message: 'Sessione non disponibile. Accedi di nuovo.' }
    if (!context.academicYear) return { status: 'error', message: 'Anno scolastico non selezionato.' }

    const snapshot = await new SupabaseAnnualPlanExecutionRepository().list(
      context.workspace.id,
      context.academicYear.id,
    )
    const section = snapshot.sections.find((candidate) => candidate.id === sectionId)
    if (!section) return { status: 'error', message: 'La classe non appartiene al workspace/anno scolastico corrente.' }

    const expectedYear = normalizeSchoolYear(context.academicYear.label)
    if (handoff.curricularContext.schoolYearRef !== expectedYear) {
      return {
        status: 'error',
        message: `Il passaggio Arena è per l’A.S. ${handoff.curricularContext.schoolYearRef}, mentre questa classe usa ${expectedYear}.`,
      }
    }

    const targetScope: AnnualPlanTargetScope = {
      schoolYearRef: handoff.curricularContext.schoolYearRef,
      disciplineRef: handoff.curricularContext.disciplineRef,
      gradeRef: gradeRef(section.grade),
      sectionRef: compactSectionRef(section.grade, section.sectionCode),
    }

    const repository = new SupabaseAnnualPlanCurriculumRepository()
    const current = await repository.currentBaseline({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      sectionId,
      disciplineRef: handoff.curricularContext.disciplineRef,
    })

    if (current?.sourceHandoffFootprintHash === handoff.structuralFootprint.hash) {
      revalidateCurriculumPaths(sectionId)
      redirect(`/classi/${encodeURIComponent(sectionId)}/curricolo-arena?accepted=known`)
    }
    if (current) {
      return {
        status: 'error',
        message: 'Questa classe ha già una baseline Arena diversa. Il nuovo passaggio richiede la rivalidazione curricolare, non un nuovo import iniziale.',
      }
    }

    const draft = buildAnnualPlanFrameworkReviewDraftV2(handoff)
    const confirmedAt = new Date().toISOString()
    const decision: TeacherFrameworkDecisionV2 = {
      contract: 'CML_HANDOFF_ACCEPTANCE_V2',
      decisionId: randomUUID(),
      actorRole: 'TEACHER',
      decision: 'ACCEPTED',
      confirmedAt,
      handoffFootprintHash: draft.source.handoffFootprintHash,
      curricularContextId: draft.source.curricularContextId,
      frameworkMessageId: draft.source.frameworkMessageId,
    }
    const accepted = prepareAnnualPlanFrameworkApplyV2({ draft, decision })
    const command = bindCurriculumContextAndCoverage({
      command: accepted,
      curricularContext: handoff.curricularContext,
      targetScope,
    })

    await repository.persist({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      sectionId,
      command,
    })

    revalidateCurriculumPaths(sectionId)
    redirect(`/classi/${encodeURIComponent(sectionId)}/curricolo-arena?accepted=1`)
  } catch (error) {
    return {
      status: 'error',
      message: curriculumIntakeMessage(error),
    }
  }
}

function revalidateCurriculumPaths(sectionId: string) {
  revalidatePath(`/classi/${sectionId}`)
  revalidatePath(`/classi/${sectionId}/curricolo-arena`)
  revalidatePath(`/classi/${sectionId}/lezioni/[blockId]`, 'page')
}

function normalizeSchoolYear(value: string) {
  return value.trim().replaceAll('/', '-')
}

function gradeRef(grade: 'PRIMA' | 'SECONDA' | 'TERZA') {
  if (grade === 'PRIMA') return 'grade-1'
  if (grade === 'SECONDA') return 'grade-2'
  return 'grade-3'
}

function compactSectionRef(grade: 'PRIMA' | 'SECONDA' | 'TERZA', sectionCode: string) {
  const number = grade === 'PRIMA' ? '1' : grade === 'SECONDA' ? '2' : '3'
  return `${number}${sectionCode.trim().toUpperCase()}`
}

function curriculumIntakeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/structural footprint mismatch/i.test(message)) return 'Il file Arena è stato modificato dopo l’esportazione: scaricalo di nuovo da Arena.'
  if (/does not match annual-plan target scope|sectionRef mismatch|grade does not match/i.test(message)) return 'Il passaggio Arena non corrisponde a questa classe.'
  if (/does not satisfy mandatory curricular requirements/i.test(message)) return 'La baseline non copre ancora tutti i requisiti curricolari obbligatori: rivedila prima di accettarla.'
  if (/workspace membership required|authenticated user required/i.test(message)) return 'La conferma richiede un docente autenticato nel workspace corrente.'
  return message
}
