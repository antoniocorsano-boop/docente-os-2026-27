import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { buildStudioAtlasMaterialHref, type TeachingContextSnapshot } from '@/core/domain/atlas-material-handoff'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { humanizeKnowledgeTitle } from '@/core/presentation/product-language'
import { openUdaAuthoring } from '../../../authoring-actions'
import './new-uda-authoring.css'

export const dynamic = 'force-dynamic'

export default async function NewUdaAuthoringPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const knowledge = new SupabaseKnowledgeRepository()
  const bundle = await knowledge.getBundle(context.workspace.id, assetId)
  if (!bundle || bundle.asset.contentCategory !== 'UDA') notFound()

  const title = humanizeKnowledgeTitle(bundle.document?.title ?? bundle.asset.originalName)
  const sourceHref = `/knowledge/${encodeURIComponent(assetId)}`
  const studioOrigin = process.env.NEXT_PUBLIC_STUDIO_ATLAS_ORIGIN
  const docenteOrigin = process.env.NEXT_PUBLIC_DOCENTE_OS_ORIGIN ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:3000'
  const grade = asGrade(bundle.asset.sourceMetadata.grade)
  const sectionLabel = firstSectionLabel(bundle.asset.classLabels ?? [])
  const discipline = metadataString(bundle.asset.sourceMetadata.discipline) ?? 'Tecnologia'
  const udaId = metadataString(bundle.asset.sourceMetadata.uda) ?? assetId
  const atlasHref = studioOrigin && grade
    ? buildStudioAtlasMaterialHref(studioOrigin, {
        schema: 'docente-os.teaching-context/v0.1',
        source: 'docente-os',
        udaId,
        udaTitle: title,
        grade,
        ...(sectionLabel ? { sectionLabel } : {}),
        discipline,
        ...(metadataString(bundle.asset.sourceMetadata.block) ? { blockId: metadataString(bundle.asset.sourceMetadata.block) } : {}),
        ...(metadataString(bundle.asset.sourceMetadata.pack) ? { packId: metadataString(bundle.asset.sourceMetadata.pack) } : {}),
        returnUrl: `${docenteOrigin}/progetta/atlas/ritorno`,
      } satisfies TeachingContextSnapshot)
    : null

  return (
    <AppShell active="design" academicYearLabel={context.academicYear.label} workspaceName={context.workspace.name} role={context.role} contentClassName="newUdaAuthoringSurface">
      <nav className="newUdaBack"><Link href="/progetta">← Progetta</Link></nav>
      <main className="newUdaGate" aria-labelledby="new-uda-title">
        <header className="newUdaGateCopy">
          <h1 id="new-uda-title">Cosa vuoi preparare?</h1>
        </header>

        <section className="newUdaContext" aria-label="Contesto UDA">
          <div><small>UDA</small><strong>{title}</strong></div>
          <span>{sectionLabel ? `${sectionLabel} · ` : ''}{discipline}</span>
        </section>

        <section className="newUdaChoices" aria-label="Azioni disponibili">
          {atlasHref ? (
            <a className="newUdaAtlasAction" href={atlasHref}>
              <span><strong>Prepara materiali con Atlas</strong><small>Presentazione, scheda, guida e rubrica</small></span>
              <b aria-hidden>→</b>
            </a>
          ) : (
            <div className="newUdaAtlasUnavailable"><strong>Prepara materiali con Atlas</strong><span>Studio Atlas non è collegato a questo ambiente.</span></div>
          )}

          <form action={openUdaAuthoring.bind(null, assetId)}>
            <button className="newUdaWorkAction" type="submit">
              <span><strong>Lavora sull’UDA</strong><small>Apri il documento di lavoro</small></span>
              <b aria-hidden>→</b>
            </button>
          </form>
        </section>

        <Link className="newUdaSourceLink" href={sourceHref}>Controlla la fonte</Link>
      </main>
    </AppShell>
  )
}

function asGrade(value: unknown): TeachingContextSnapshot['grade'] | null {
  return value === 'prima' || value === 'seconda' || value === 'terza' ? value : null
}

function metadataString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function firstSectionLabel(labels: string[]) {
  return labels.find((label) => /^[1-3]\s*[A-Z]$/i.test(label.replace(/[ªº°]/g, '').trim()))
}
