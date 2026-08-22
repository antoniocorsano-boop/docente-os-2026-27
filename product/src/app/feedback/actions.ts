'use server'

import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveHumanTaskLessonProjection } from '@/core/presentation/human-task-content'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { createClient } from '@/lib/supabase/server'

export type ExperienceFeedbackState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export const INITIAL_EXPERIENCE_FEEDBACK_STATE: ExperienceFeedbackState = {
  status: 'idle',
  message: '',
}

const COMPLETE_STATUSES = new Set(['SVOLTO', 'RECUPERATO', 'RIMODULATO'])

export async function submitLessonExperienceFeedback(
  _previousState: ExperienceFeedbackState,
  formData: FormData,
): Promise<ExperienceFeedbackState> {
  const sectionId = requiredText(formData, 'sectionId')
  const blockId = requiredText(formData, 'blockId').toUpperCase()
  const satisfaction = Number(requiredText(formData, 'satisfaction'))
  const rawComment = formData.get('comment')
  const comment = typeof rawComment === 'string' ? rawComment.trim() : ''

  if (!Number.isInteger(satisfaction) || satisfaction < 1 || satisfaction > 5) {
    return { status: 'error', message: 'Scegli una valutazione prima di inviare il feedback.' }
  }
  if (comment.length > 1500) {
    return { status: 'error', message: 'Accorcia il commento a 1500 caratteri o meno.' }
  }

  try {
    const workspaceRepository = new SupabaseWorkspaceRepository()
    const context = await workspaceRepository.getCurrentContext()
    if (!context?.academicYear) {
      return { status: 'error', message: 'Non riesco a collegare il feedback al tuo anno scolastico attivo.' }
    }

    const annualRepository = new SupabaseAnnualPlanExecutionRepository()
    const snapshot = await annualRepository.list(context.workspace.id, context.academicYear.id)
    const section = snapshot.sections.find((item) => item.id === sectionId)
    if (!section) {
      return { status: 'error', message: 'La classe non appartiene più al piano annuale attivo.' }
    }

    const grade = GRADE_UI[section.grade]
    const block = buildBlocks(grade).find((item) => item.id === blockId)
    const projection = block ? resolveHumanTaskLessonProjection(grade, block) : null
    if (!block || !projection) {
      return { status: 'error', message: 'Non riesco a collegare il feedback alla lezione appena conclusa.' }
    }

    const source = CANONICAL_PLAN_SOURCES[grade]
    const progress = snapshot.progress.find((entry) =>
      entry.sectionId === section.id &&
      entry.canonicalGenerationId === source.generationId &&
      entry.blockId === block.id,
    )
    if (!progress || !COMPLETE_STATUSES.has(progress.status)) {
      return { status: 'error', message: 'Il feedback su questo flusso è disponibile dopo la registrazione della lezione.' }
    }

    const supabase = await createClient()
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub
    if (claimsError || !userId) {
      return { status: 'error', message: 'La sessione non è più valida. Ricarica la pagina e riprova.' }
    }

    const { error } = await supabase.from('experience_feedback').insert({
      workspace_id: context.workspace.id,
      academic_year_id: context.academicYear.id,
      surface: 'CLASS',
      journey: 'LESSON_EXECUTION',
      task_intent: 'RECORD',
      context_ref: {
        sectionId: section.id,
        grade: section.grade,
        blockId: block.id,
        projectionId: projection.projectionId,
      },
      satisfaction,
      comment: comment || null,
      created_by: userId,
    })

    if (error) {
      return { status: 'error', message: 'Il feedback non è stato salvato. Puoi riprovare senza perdere il lavoro della lezione.' }
    }

    return {
      status: 'success',
      message: 'Grazie. Useremo questo feedback insieme al punto del percorso in cui lo hai inviato per decidere cosa migliorare.',
    }
  } catch {
    return { status: 'error', message: 'Il feedback non è stato salvato. Puoi riprovare più tardi.' }
  }
}

function requiredText(formData: FormData, name: string) {
  const value = formData.get(name)
  if (typeof value !== 'string' || !value.trim()) return ''
  return value.trim()
}
