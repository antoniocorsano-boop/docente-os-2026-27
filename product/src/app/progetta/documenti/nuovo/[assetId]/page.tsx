import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
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
        <div className="newUdaActions">
          <form action={openUdaAuthoring.bind(null, assetId)}><button type="submit">Inizia documento di lavoro</button></form>
          <Link href={sourceHref}>Non ancora: apri la fonte</Link>
        </div>
      </section>
    </AppShell>
  )
}
