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
import { revalidateLegacyClassMaterial } from './material-revalidation-actions'
import './classroom-session.css'
import './material-revalidation.css'

export const dynamic = 'force-dynamic'

export default async function ClassroomSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionId: string; assetId: string }>
  searchParams: Promise<{ material?: string }>
}) {
  const { sectionId, assetId } = await params
  const query = await searchParams
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

  const canRevalidateMaterial = view.approvalLabel !== 'Confermato' && Boolean(source && canonicalBlock && projection)
  const materialStatus = query.material === 'confirmed'
    ? { tone: 'success', title: 'Collegamento canonico confermato.', detail: 'Il materiale è ora legato a questa lezione tramite una versione Knowledge verificata.' }
    : query.material === 'unavailable'
      ? { tone: 'warning', title: 'Riconferma non disponibile.', detail: 'Serve una versione Knowledge corrente e verificabile del materiale prima di poterlo confermare.' }
      : query.material === 'failed'
        ? { tone: 'warning', title: 'Riconferma non completata.', detail: 'Il controllo canonico non ha accettato il materiale. I metadati storici non sono stati modificati.' }
        : null

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

      {materialStatus ? (
        <section className={`classroomMaterialStatus ${materialStatus.tone}`} role="status" aria-live="polite">
          <strong>{materialStatus.title}</strong>
          <span>{materialStatus.detail}</span>
        </section>
      ) : null}

      <ClassroomSessionClient view={view} />

      {canRevalidateMaterial ? (
        <details className="classroomRevalidation" open={Boolean(query.material)}>
          <summary>Ricollega questo materiale alla lezione</summary>
          <div className="classroomRevalidationBody">
            <div className="classroomRevalidationIntro">
              <span>RICONFERMA ESPLICITA</span>
              <strong>Stabilisci il collegamento canonico senza riscrivere la storia del materiale.</strong>
              <p>Il vecchio stato del materiale resta come evidenza storica. Per confermarlo oggi devi indicarne funzione, formato e destinatari; Docente OS userà soltanto la generazione Knowledge corrente e verificabile.</p>
            </div>
            {bundle.asset.currentGenerationId && canonicalBlock ? (
              <form action={revalidateLegacyClassMaterial} className="classroomRevalidationForm">
                <input type="hidden" name="sectionId" value={section.id} />
                <input type="hidden" name="assetId" value={bundle.asset.id} />
                <input type="hidden" name="blockId" value={canonicalBlock.id} />
                <label>
                  <span>Funzione nella lezione</span>
                  <select name="materialRole" required defaultValue="">
                    <option value="" disabled>Seleziona la funzione</option>
                    <option value="TEACHER_BRIEF">Guida docente</option>
                    <option value="LIM_VIEW">Da mostrare alla LIM</option>
                    <option value="STUDENT_HANDOUT">Scheda per gli studenti</option>
                    <option value="MINI_DECK">Mini presentazione</option>
                    <option value="VISUAL_AID">Supporto visuale</option>
                    <option value="ASSESSMENT">Verifica</option>
                  </select>
                </label>
                <label>
                  <span>Formato</span>
                  <select name="artifactKind" required defaultValue="">
                    <option value="" disabled>Seleziona il formato</option>
                    <option value="PRESENTATION">Presentazione</option>
                    <option value="WORKSHEET">Scheda di lavoro</option>
                    <option value="GUIDE">Guida</option>
                    <option value="RUBRIC">Rubrica</option>
                    <option value="VISUAL">Visuale</option>
                    <option value="ASSESSMENT">Verifica</option>
                    <option value="OTHER">Altro</option>
                  </select>
                </label>
                <label>
                  <span>Destinatari</span>
                  <select name="audience" required defaultValue="">
                    <option value="" disabled>Seleziona i destinatari</option>
                    <option value="TEACHER">Docente</option>
                    <option value="STUDENT">Studenti</option>
                    <option value="MIXED">Docente e studenti</option>
                  </select>
                </label>
                <div className="classroomRevalidationActions">
                  <small>Nessuna scelta viene dedotta automaticamente dai metadati legacy.</small>
                  <button type="submit">Riconferma per questa lezione</button>
                </div>
              </form>
            ) : (
              <div className="classroomRevalidationUnavailable" role="status">
                <strong>Prima serve una versione Knowledge verificabile.</strong>
                <span>Questo materiale non ha ancora una generazione corrente utilizzabile per una conferma canonica.</span>
              </div>
            )}
          </div>
        </details>
      ) : null}

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
