import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { buildClassMaterialAcceptanceEvidenceV1 } from '@/core/application/class-material-acceptance-evidence'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseCanonicalPlanSourceRepository } from '@/core/infrastructure/supabase/supabase-canonical-plan-source-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseLessonDesignRepository } from '@/core/infrastructure/supabase/supabase-lesson-design-repository'
import { SupabaseMaterialContentReadPortV1 } from '@/core/infrastructure/supabase/supabase-material-content-read-port'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { resolveRuntimeHumanTaskLessonProjection } from '@/core/presentation/human-task-runtime'
import { buildBlocks, CANONICAL_PLAN_SOURCES, GRADE_UI } from '@/app/piano-annuale/model'
import { ClassroomSessionClient } from './ClassroomSessionClient'
import { buildClassroomSessionView } from './classroom-session-model'
import './classroom-session.css'

export const dynamic = 'force-dynamic'

export default async function ClassroomSessionPage({
  params,
}: {
  params: Promise<{ sectionId: string; assetId: string }>
}) {
  const { sectionId, assetId } = await params
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const [snapshot, bundle, settings] = await Promise.all([
    new SupabaseAnnualPlanExecutionRepository().list(context.workspace.id, context.academicYear.id),
    new SupabaseKnowledgeRepository().getBundle(context.workspace.id, assetId),
    new SupabaseTeacherSettingsRepository().getOrCreate(context.workspace.id, context.academicYear.id),
  ])

  const section = snapshot.sections.find((item) => item.id === sectionId)
  if (!section || !bundle) notFound()

  const grade = GRADE_UI[section.grade]
  const blocks = buildBlocks(grade)
  const canonicalBlockId = typeof bundle.asset.sourceMetadata.canonicalBlockId === 'string'
    ? bundle.asset.sourceMetadata.canonicalBlockId.trim().toUpperCase()
    : ''
  const canonicalBlock = canonicalBlockId
    ? blocks.find((item) => item.id === canonicalBlockId) ?? null
    : null
  const source = canonicalBlock
    ? await new SupabaseCanonicalPlanSourceRepository().resolve({
        workspaceId: context.workspace.id,
        academicYearId: context.academicYear.id,
        code: CANONICAL_PLAN_SOURCES[grade].code,
      })
    : null
  const projection = canonicalBlock
    ? resolveRuntimeHumanTaskLessonProjection(grade, canonicalBlock)
    : null
  const acceptanceExtensions = source && canonicalBlock && projection
    ? await new SupabaseLessonDesignRepository().list({
        workspaceId: context.workspace.id,
        academicYearId: context.academicYear.id,
        sectionId: section.id,
        canonicalPlanAssetId: source.assetId,
        canonicalGenerationId: source.generationId,
        blockId: canonicalBlock.id,
        projectionId: projection.projectionId,
      })
    : []
  const acceptanceEvidence = await buildClassMaterialAcceptanceEvidenceV1({
    workspaceId: context.workspace.id,
    extensions: acceptanceExtensions,
    readPort: new SupabaseMaterialContentReadPortV1(),
  })
  const view = buildClassroomSessionView(section, bundle.asset, acceptanceEvidence)
  if (!view) notFound()

  return (
    <AppShell
      active="classes"
      academicYearLabel={context.academicYear.label}
      workspaceName={settings.schoolName || context.workspace.name}
      role={context.role}
      contentClassName="classroomSessionSurface"
    >
      <nav className="classroomContextNav" aria-label="Contesto della classe">
        <Link href={`/classi/${encodeURIComponent(sectionId)}`}>← Torna alla classe</Link>
        <Link href={`/classi/${encodeURIComponent(sectionId)}/diario`}>Apri Diario</Link>
      </nav>
      <ClassroomSessionClient view={view} />
      <section className="classroomRecordBar" aria-label="Chiusura della lezione">
        <div>
          <span>DOPO LA LEZIONE</span>
          <strong>Registra ciò che è realmente successo in classe.</strong>
        </div>
        <Link href={`/classi/${encodeURIComponent(sectionId)}/in-classe/${encodeURIComponent(assetId)}/registra`}>
          Registra la lezione
        </Link>
      </section>
    </AppShell>
  )
}
