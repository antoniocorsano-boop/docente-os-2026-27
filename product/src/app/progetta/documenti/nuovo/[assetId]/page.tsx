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
  const body = bundle.document?.normalizedMarkdown ?? bundle.document?.normalizedText ?? bundle.asset.originalText ?? ''
  const sourceHref = `/knowledge/${encodeURIComponent(assetId)}`
  const studioOrigin = process.env.NEXT_PUBLIC_STUDIO_ATLAS_ORIGIN
  const docenteOrigin = process.env.NEXT_PUBLIC_DOCENTE_OS_ORIGIN ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:3000'
  const grade = asGrade(bundle.asset.sourceMetadata.grade)
  const sectionLabel = firstSectionLabel(bundle.asset.classLabels ?? [])
  const udaId = metadataString(bundle.asset.sourceMetadata.uda) ?? assetId
  const atlasHref = studioOrigin && grade
    ? buildStudioAtlasMaterialHref(studioOrigin, {
        schema: 'docente-os.teaching-context/v0.1',
        source: 'docente-os',
        udaId,
        udaTitle: title,
        grade,
        ...(sectionLabel ? { sectionLabel } : {}),
        discipline: metadataString(bundle.asset.sourceMetadata.discipline) ?? 'Tecnologia',
        ...(metadataString(bundle.asset.sourceMetadata.block) ? { blockId: metadataString(bundle.asset.sourceMetadata.block) } : {}),
        ...(metadataString(bundle.asset.sourceMetadata.pack) ? { packId: metadataString(bundle.asset.sourceMetadata.pack) } : {}),
        returnUrl: `${docenteOrigin}/progetta/atlas/ritorno`,
      } satisfies TeachingContextSnapshot)
    : null

  return (
    <AppShell active="design" academicYearLabel={context.academicYear.label} workspaceName={context.workspace.name} role={context.role} contentClassName="newUdaAuthoringSurface">
      <nav className="newUdaBack"><Link href="/progetta">← Torna a Progetta</Link></nav>
      <section className="newUdaGate" aria-labelledby="new-uda-title">
        <div className="newUdaGateCopy">
          <p>DOCUMENTO DI LAVORO</p>
          <h1 id="new-uda-title">Prepara questa UDA</h1>
          <span>La fonte resta invariata. DOCENTE OS crea una copia di lavoro separata e versionata solo dopo la tua conferma.</span>
        </div>
        <article className="newUdaSource">
          <small>FONTE SELEZIONATA</small>
          <h2>{title}</h2>
          <p>{bundle.document?.summary ?? 'Unità di apprendimento presente in Conoscenza.'}</p>
          <div><span>{body.length.toLocaleString('it-IT')} caratteri disponibili</span><Link href={sourceHref}>Controlla la fonte</Link></div>
        </article>
        <div className="newUdaEffects">
          <div><strong>Cosa succede</strong><p>Viene creata, oppure riaperta se esiste già, una UDA di lavoro collegata a questa fonte. Ogni salvataggio successivo produrrà una nuova versione.</p></div>
          <div><strong>Cosa non succede</strong><p>La fonte in Conoscenza non viene modificata e non vengono creati eventi, attività Planner o modifiche al Piano annuale.</p></div>
        </div>
        <section className="newUdaAtlas" aria-labelledby="new-uda-atlas-title">
          <div><small>MATERIALI PER LA LEZIONE</small><h2 id="new-uda-atlas-title">Continua in Studio Atlas senza perdere il contesto</h2><p>Atlas riceve solo UDA, classe e riferimenti didattici. Potrai selezionare i materiali e tornare qui prima di qualsiasi associazione alla lezione.</p></div>
          {atlasHref ? <a className="newUdaAtlasAction" href={atlasHref}>Prepara materiali con Atlas <span aria-hidden>→</span></a> : <span className="newUdaAtlasUnavailable">Studio Atlas non è ancora collegato a questo ambiente.</span>}
        </section>
        <div className="newUdaActions">
          <form action={openUdaAuthoring.bind(null, assetId)}><button type="submit">Inizia documento di lavoro</button></form>
          <Link href={sourceHref}>Non ancora: apri la fonte</Link>
        </div>
      </section>
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
