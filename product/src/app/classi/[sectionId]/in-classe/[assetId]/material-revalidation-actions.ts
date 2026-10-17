'use server'

import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { acceptLessonMaterialProposal } from '@/core/application/material-acceptance'
import { digestMaterialContentV1 } from '@/core/application/material-content-digest'
import type {
  LessonMaterialArtifactKind,
  LessonMaterialAudience,
  LessonMaterialBindingV1,
  LessonMaterialRole,
} from '@/core/domain/lesson-material-binding'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCanonicalPlanSourceRepository } from '@/core/infrastructure/supabase/supabase-canonical-plan-source-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseMaterialContentReadPortV1 } from '@/core/infrastructure/supabase/supabase-material-content-read-port'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { createClient } from '@/lib/supabase/server'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'

const MATERIAL_ROLES = new Set<LessonMaterialRole>([
  'TEACHER_BRIEF',
  'LIM_VIEW',
  'STUDENT_HANDOUT',
  'MINI_DECK',
  'VISUAL_AID',
  'ASSESSMENT',
])
const ARTIFACT_KINDS = new Set<LessonMaterialArtifactKind>([
  'PRESENTATION',
  'WORKSHEET',
  'GUIDE',
  'RUBRIC',
  'VISUAL',
  'ASSESSMENT',
  'OTHER',
])
const AUDIENCES = new Set<LessonMaterialAudience>(['TEACHER', 'STUDENT', 'MIXED'])
const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const
const CLASS_RESOURCE_MARKER = 'CLASS_LESSON_MATERIAL'

export async function revalidateLegacyClassMaterial(formData: FormData) {
  const sectionId = requiredFormValue(formData, 'sectionId')
  const assetId = requiredFormValue(formData, 'assetId')
  const blockId = requiredFormValue(formData, 'blockId').toUpperCase()
  const materialRole = enumFormValue(formData, 'materialRole', MATERIAL_ROLES)
  const artifactKind = enumFormValue(formData, 'artifactKind', ARTIFACT_KINDS)
  const audience = enumFormValue(formData, 'audience', AUDIENCES)

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const [snapshot, bundle] = await Promise.all([
    new SupabaseAnnualPlanExecutionRepository().list(context.workspace.id, context.academicYear.id),
    new SupabaseKnowledgeRepository().getBundle(context.workspace.id, assetId),
  ])
  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section || !bundle) notFound()

  const grade = GRADE_UI[section.grade]
  const block = buildBlocks(grade).find((item) => item.id === blockId) ?? null
  if (!block) notFound()

  const canonicalBlockId = metadataString(bundle.asset.sourceMetadata, 'canonicalBlockId')?.toUpperCase() ?? null
  const metadataSectionId = metadataString(bundle.asset.sourceMetadata, 'sectionId')
  const compactClassLabel = `${GRADE_NUMBER[section.grade]}${section.sectionCode}`.toUpperCase()
  const assetBelongsToClass = bundle.asset.classLabels.some(
    (label) => label.trim().replace(/\s+/g, '').toUpperCase() === compactClassLabel,
  )
  const historicalClassMaterial =
    bundle.asset.contentCategory === 'TEACHING_RESOURCE'
    && bundle.asset.sourceMetadata.docenteOsResource === CLASS_RESOURCE_MARKER
    && canonicalBlockId === block.id
    && (!metadataSectionId || metadataSectionId === section.id)
    && assetBelongsToClass
    && (!bundle.asset.academicYearId || bundle.asset.academicYearId === context.academicYear.id)

  if (!historicalClassMaterial) {
    redirect(cockpitHref(sectionId, assetId, 'unavailable'))
  }

  const source = await new SupabaseCanonicalPlanSourceRepository().resolve({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    code: CANONICAL_PLAN_SOURCES[grade].code,
  })
  const projection = resolveRuntimeHumanTaskLessonProjection(grade, block)
  if (!source || !projection) {
    redirect(cockpitHref(sectionId, assetId, 'unavailable'))
  }

  const currentGenerationId = bundle.asset.currentGenerationId
  if (!currentGenerationId) {
    redirect(cockpitHref(sectionId, assetId, 'unavailable'))
  }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const actorId = claimsData?.claims?.sub
  if (claimsError || !actorId) redirect('/login')

  const content = new SupabaseMaterialContentReadPortV1()
  const record = await content.readKnowledgeGeneration({
    workspaceId: context.workspace.id,
    assetId,
    generationId: currentGenerationId,
  })
  if (
    !record
    || record.assetId !== assetId
    || record.generationId !== currentGenerationId
    || record.currentGenerationId !== currentGenerationId
    || record.generationStatus !== 'SUCCEEDED'
    || !record.snapshot
    || !record.sourceSha256MatchesBytes
    || (!record.sourceIsImmutableLocal && !record.sourceContentAvailable)
  ) {
    redirect(cockpitHref(sectionId, assetId, 'unavailable'))
  }

  const contentDigest = digestMaterialContentV1(record.snapshot)
  const binding: LessonMaterialBindingV1 = {
    schema: 'docente-os.lesson-material-binding.v1',
    role: materialRole,
    artifactKind,
    audience,
    materialRef: {
      kind: 'KNOWLEDGE_GENERATION',
      assetId,
      generationId: currentGenerationId,
      contentDigest,
    },
    provenance: {
      sourceArtifactRefs: [`knowledge:${assetId}:${currentGenerationId}`],
      derivationRefs: [`legacy-class-material-revalidation:${assetId}`],
      evidenceRefs: [`knowledge-generation:${currentGenerationId}`],
      rightsState: 'UNKNOWN',
      attributionRequirements: [],
    },
  }

  const authority = {
    actorId,
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: section.id,
    canonicalPlanAssetId: source.assetId,
    canonicalGenerationId: source.generationId,
    blockId: block.id,
    projectionId: projection.projectionId,
  }
  const lessonDesignRepository = new SupabaseLessonDesignRepository()
  const title = bundle.document?.title?.trim() || bundle.asset.originalName?.trim() || 'Materiale della lezione'
  const body = `Riconferma esplicita del docente del materiale legacy ${assetId} per ${block.id}. I metadati storici restano invariati; l'accettazione corrente usa la generazione Knowledge verificata.`
  const idempotencyKey = [
    'legacy-class-material-revalidation:v1',
    context.workspace.id,
    context.academicYear.id,
    section.id,
    source.assetId,
    source.generationId,
    block.id,
    projection.projectionId,
    assetId,
    currentGenerationId,
  ].join(':')

  try {
    await acceptLessonMaterialProposal(
      {
        sectionId: section.id,
        blockId: block.id,
        binding,
        idempotencyKey,
        title,
        body,
      },
      {
        authority: {
          resolve: async (requested) =>
            requested.sectionId === section.id && requested.blockId === block.id ? authority : null,
        },
        content,
        lessonDesign: {
          list: (lessonContext) => lessonDesignRepository.list(lessonContext),
          addToolProposalOnce: (lessonContext, input, dedupeKey) =>
            lessonDesignRepository.addToolProposalOnce(lessonContext, input, dedupeKey),
          accept: (lessonContext, extensionId) => lessonDesignRepository.accept(lessonContext, extensionId),
        },
      },
    )
  } catch (error) {
    console.error('Legacy class material revalidation failed', error)
    redirect(cockpitHref(sectionId, assetId, 'failed'))
  }

  revalidatePath(`/classi/${encodeURIComponent(sectionId)}`)
  revalidatePath(`/classi/${encodeURIComponent(sectionId)}/in-classe/${encodeURIComponent(assetId)}`)
  redirect(cockpitHref(sectionId, assetId, 'confirmed'))
}

function requiredFormValue(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${key} is required`)
  return value.trim()
}

function enumFormValue<T extends string>(formData: FormData, key: string, allowed: Set<T>): T {
  const value = requiredFormValue(formData, key)
  if (!allowed.has(value as T)) throw new Error(`Unsupported ${key}`)
  return value as T
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function cockpitHref(sectionId: string, assetId: string, material: 'confirmed' | 'unavailable' | 'failed') {
  return `/classi/${encodeURIComponent(sectionId)}/in-classe/${encodeURIComponent(assetId)}?material=${material}`
}
