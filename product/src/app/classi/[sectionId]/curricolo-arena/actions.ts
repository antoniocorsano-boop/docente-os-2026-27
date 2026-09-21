'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { SupabaseAnnualPlanCurriculumRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-curriculum-repository'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { eco02PilotIdentityFromEnv } from '@/core/server/eco02-pilot-config'
import { bindCurriculumContextAndCoverage } from '@/core/domain/cml-curriculum-applicability'
import {
  assertEco02PilotCurriculumIntakeScope,
  assertUploadedArenaAuthorityContextAllowed,
  buildArenaCurriculumTargetScope,
  ECO02_PILOT_UPLOAD_MAX_BYTES,
} from '@/core/domain/cml-discipline-binding'
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

export async function acceptArenaCurriculumHandoff(
  _previous: CurriculumArenaIntakeActionState,
  formData: FormData,
): Promise<CurriculumArenaIntakeActionState> {
  const sectionId = String(formData.get('sectionId') ?? '').trim()
  const rawHandoffJson = String(formData.get('handoffJson') ?? '')
  if (Buffer.byteLength(rawHandoffJson, 'utf8') > ECO02_PILOT_UPLOAD_MAX_BYTES) {
    return { status: 'error', message: 'Il passaggio Arena supera il limite del pilota. Esporta di nuovo il file da Arena.' }
  }
  const handoffJson = rawHandoffJson.trim()
  if (!sectionId || !handoffJson) {
    return { status: 'error', message: 'Seleziona un passaggio Arena valido prima di confermare.' }
  }

  let destination: string | null = null

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

    assertEco02PilotCurriculumIntakeScope({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      sectionId: section.id,
      grade: section.grade,
      sectionCode: section.sectionCode,
      disciplineRef: handoff.curricularContext.disciplineRef,
    }, eco02PilotIdentityFromEnv())

    try {
      assertUploadedArenaAuthorityContextAllowed(handoff.curricularContext)
    } catch {
      return {
        status: 'error',
        message: 'Un file locale non può attestare un’approvazione istituzionale. La rivalidazione definitiva richiede un segnale Arena verificabile lato server.',
      }
    }

    const expectedYear = normalizeSchoolYear(context.academicYear.label)
    if (handoff.curricularContext.schoolYearRef !== expectedYear) {
      return {
        status: 'error',
        message: `Il passaggio Arena è per l’A.S. ${handoff.curricularContext.schoolYearRef}, mentre questa classe usa ${expectedYear}.`,
      }
    }

    const localSectionRef = section.sectionCode.trim().toUpperCase()
    const targetScope = buildArenaCurriculumTargetScope({
      context: handoff.curricularContext,
      localSectionRef,
    })
    if (targetScope.gradeRef !== gradeRef(section.grade)) {
      return { status: 'error', message: 'Il passaggio Arena non corrisponde al grado di questa classe.' }
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
      destination = `/classi/${encodeURIComponent(sectionId)}/curricolo-arena?accepted=known`
    } else if (current) {
      return {
        status: 'error',
        message: 'Questa classe ha già una baseline Arena diversa. Questo caricamento locale non sostituisce la baseline corrente: serve il percorso di rivalidazione governata.',
      }
    }

    if (!destination) {
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
      destination = `/classi/${encodeURIComponent(sectionId)}/curricolo-arena?accepted=1`
    }
  } catch (error) {
    return {
      status: 'error',
      message: curriculumIntakeMessage(error),
    }
  }

  if (destination) redirect(destination)
  return { status: 'error', message: 'Il passaggio Arena non è stato acquisito.' }
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


function curriculumIntakeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/structural footprint mismatch/i.test(message)) return 'Il file Arena è stato modificato dopo l’esportazione: scaricalo di nuovo da Arena.'
  if (/does not match annual-plan target scope|sectionRef mismatch|grade does not match/i.test(message)) return 'Il passaggio Arena non corrisponde a questa classe.'
  if (/does not satisfy mandatory curricular requirements/i.test(message)) return 'La baseline non copre ancora tutti i requisiti curricolari obbligatori: rivedila prima di accettarla.'
  if (/ECO-02 curriculum intake is limited/i.test(message)) return 'Il collegamento Arena è attivo soltanto per il pilota Tecnologia 2C.'
  if (/ECO-02 curriculum intake accepts only Technology/i.test(message)) return 'Il pilota accetta esclusivamente il passaggio di Tecnologia.'
  if (/workspace membership required|authenticated user required/i.test(message)) return 'La conferma richiede un docente autenticato nel workspace corrente.'
  return message
}
