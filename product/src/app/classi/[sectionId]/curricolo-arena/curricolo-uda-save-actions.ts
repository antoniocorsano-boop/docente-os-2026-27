'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseAuthoredDocumentRepository } from '@/core/infrastructure/supabase/supabase-authored-document-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseTeachingAssignmentReader } from '@/core/infrastructure/supabase/supabase-teaching-assignment-reader'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { TRUSTED_ARENA_2026_RELEASE_SHA256 } from '@/core/domain/cml-provisional-arena-blob'
import {
  createCurricoloWorkProposal, curricoloExcerptById, curricoloProposalAsMarkdown,
  type CurricoloWorkProposal,
} from '@/core/domain/cml-curricolo-workbench'
import { readProvisionalArenaReferenceForClass } from '@/core/server/cml-provisional-arena-release'

type EditableFields = Pick<CurricoloWorkProposal,
  'title' | 'theme' | 'objective' | 'evidence' | 'task' | 'resources' | 'duration' | 'steps' | 'observation'
>

/**
 * M3 (UDA only): a teacher-approved draft is a NEW teacher-authored source
 * inside the existing Conoscenza and Progetta facilities. It is NOT the Arena
 * master, an institutional adoption, or a mutation of a P7 baseline.
 *
 * The server re-reads and verifies the exact Arena release before any write.
 * The client never supplies a trusted source digest or source authority.
 */
export async function saveArenaUdaInProgetta(input: {
  sectionId: string
  excerptId: string
  sourceEvidence: string
  editable: EditableFields
}): Promise<{ href: string }> {
  if (!input.sectionId || !input.excerptId) throw new Error('Seleziona un riferimento curricolare valido')
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context || !context.academicYear) throw new Error('Sessione docente o anno scolastico non disponibile')
  if (context.workspace.kind !== 'PERSONAL' || context.role !== 'OWNER'
    || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') !== 'https://gnshgapmwyjamhmlikeg.supabase.co') {
    throw new Error('La creazione è disponibile soltanto nello spazio personale di collaudo')
  }

  const snapshot = await new SupabaseAnnualPlanExecutionRepository().list(
    context.workspace.id, context.academicYear.id,
  )
  const section = snapshot.sections.find(item => item.id === input.sectionId)
  if (!section) throw new Error('La classe non appartiene allo spazio docente')

  const [assignments, disciplines] = await Promise.all([
    new SupabaseTeachingAssignmentReader().list(context.workspace.id, context.academicYear.id),
    new SupabaseTeacherSettingsRepository().listDisciplines(context.workspace.id, context.academicYear.id),
  ])
  const result = await readProvisionalArenaReferenceForClass({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: section.id,
    schoolYearRef: context.academicYear.label,
    grade: section.grade,
    assignments,
    disciplines,
  })
  if (result.status !== 'AVAILABLE') {
    throw new Error('Fonte Arena non disponibile o non verificata. Nessuna bozza è stata salvata.')
  }
  const selected = curricoloExcerptById(result.reference, input.excerptId)
  if (!selected) throw new Error('Riferimento non presente nel curricolo verificato')

  // Validate the canonical selection on the server; every editable field is
  // explicitly a teacher adaptation and never changes the original excerpt.
  const base = createCurricoloWorkProposal({
    reference: result.reference,
    selected,
    kind: 'UDA',
    evidence: input.sourceEvidence,
    theme: input.editable.theme,
  })
  const safe = sanitizeEditable(input.editable)
  const proposal: CurricoloWorkProposal = { ...base, ...safe }
  const body = curricoloProposalAsMarkdown(proposal)
  if (Buffer.byteLength(body, 'utf8') > 240_000) throw new Error('Documento troppo esteso')

  const sourceLocator = `docente-os:arena-teacher-uda:${section.id}:${createHash('sha256').update(body).digest('hex')}`
  const knowledge = new SupabaseKnowledgeRepository()
  const existing = await knowledge.findBySource(context.workspace.id, 'MANUAL', sourceLocator)
  if (existing && (
    existing.sourceMetadata.origin !== 'ARENA_TEACHER_PROPOSAL'
    || existing.academicYearId !== context.academicYear.id
  )) throw new Error('La risorsa già presente non corrisponde alla proposta autorizzata')

  const asset = existing ?? await knowledge.capture({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    assetKind: 'NOTE',
    sourceProvider: 'MANUAL',
    sourceLocator,
    originalName: safe.title,
    originalText: body,
    mimeType: 'text/plain',
    byteSize: Buffer.byteLength(body, 'utf8'),
    sourceMetadata: {
      origin: 'ARENA_TEACHER_PROPOSAL',
      statoFonte: 'PROVISIONAL_NOT_IN_FORCE',
      originalReleaseSha256: TRUSTED_ARENA_2026_RELEASE_SHA256,
      sourceVersion: result.reference.sourceVersion,
      sourceSegmentId: result.reference.segmentId,
      sourceField: selected.facet,
      sourceIndex: selected.sourceIndex,
      sourceEvidence: input.sourceEvidence,
      excerptIndex: selected.excerptIndex,
      schoolYearRef: result.reference.schoolYearRef,
      sectionId: section.id,
      teacherDecision: 'EXPLICIT_SAVE',
      originalText: selected.originalText,
    },
  })
  await knowledge.updateContext(asset.id, {
    academicYearId: context.academicYear.id,
    contentCategory: 'UDA',
    disciplines: ['Tecnologia'],
    classLabels: [`${section.grade === 'PRIMA' ? '1' : section.grade === 'SECONDA' ? '2' : '3'}${section.sectionCode}`],
    contextStatus: 'REVIEWED',
    reliability: 'TO_VERIFY',
  })

  const documentId = await new SupabaseAuthoredDocumentRepository().openUda({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sourceAssetId: asset.id,
    initialTitle: safe.title,
    initialBodyMarkdown: body,
  })
  revalidatePath('/progetta')
  revalidatePath(`/progetta/documenti/${documentId}`)
  return { href: `/progetta/documenti/${encodeURIComponent(documentId)}` }
}

function sanitizeEditable(input: EditableFields): EditableFields {
  const fields: (keyof EditableFields)[] = [
    'title', 'theme', 'objective', 'evidence', 'task', 'resources', 'duration', 'steps', 'observation',
  ]
  const safe = {} as EditableFields
  for (const key of fields) {
    if (typeof input[key] !== 'string' || input[key].length > 15000) {
      throw new Error('La proposta contiene un campo non valido o troppo esteso')
    }
    safe[key] = input[key].trim()
  }
  if (!safe.title || safe.title.length > 300) throw new Error('Inserisci un titolo di massimo 300 caratteri')
  if (!safe.objective || !safe.evidence || !safe.task) throw new Error('Completa obiettivo, evidenza e compito della UDA')
  return safe
}
