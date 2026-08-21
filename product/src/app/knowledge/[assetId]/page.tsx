import { notFound, redirect } from 'next/navigation'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ assetId: string }> }

export default async function KnowledgeAssetPage({ params }: PageProps) {
  const { assetId } = await params
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const repository = new SupabaseKnowledgeRepository()
  const bundle = await repository.getBundle(context.workspace.id, assetId)
  if (!bundle) notFound()

  const { asset, document, units } = bundle

  return (
    <div className="appShell">
      <aside className="navRail" aria-label="Navigazione principale">
        <div className="brandLockup"><span className="brandMark">D</span><div><strong>DOCENTE OS</strong><span>{context.academicYear?.label ?? 'Anno da configurare'}</span></div></div>
        <nav className="navList"><a className="navItem" href="/planner"><span aria-hidden>◎</span> Oggi</a><a className="navItem active" href="/knowledge"><span aria-hidden>◇</span> Conoscenza</a></nav>
        <div className="navFooter"><span className="workspaceDot" aria-hidden /><div><strong>{context.workspace.name}</strong><span>{context.role}</span></div></div>
      </aside>

      <main className="workSurface knowledgeSurface detailSurface">
        <header className="mobileHeader"><div><span className="mobileEyebrow">KNOWLEDGE BASE</span><strong>Dettaglio asset</strong></div><a className="iconButton knowledgeBack" href="/knowledge" aria-label="Torna alla KB">←</a></header>

        <div className="detailTopbar"><a href="/knowledge">← Torna alla Conoscenza</a><span className={`processingPill ${asset.processingStatus.toLowerCase()}`}>{asset.processingStatus}</span></div>
        <section className="plannerHeader knowledgeHeader">
          <div><p className="contextLine">{asset.sourceProvider} · {asset.assetKind}</p><h1>{document?.title ?? asset.originalName ?? 'Asset senza titolo'}</h1><p className="dayLine">Acquisito {formatDate(asset.capturedAt)}</p></div>
        </section>

        <section className="provenanceBar" aria-label="Provenienza">
          <div><span>Fonte</span><strong>{asset.sourceProvider}</strong></div>
          <div><span>Tipo</span><strong>{asset.assetKind}</strong></div>
          <div><span>MIME</span><strong>{asset.mimeType ?? '—'}</strong></div>
          <div><span>Processore</span><strong>{document?.processingVersion ?? 'Non ancora elaborato'}</strong></div>
        </section>

        <div className="knowledgeFlowGrid">
          <section className="knowledgePanel flowPanel originalPanel">
            <div className="knowledgePanelHeading"><div><span className="panelEyebrow">1 · ORIGINALE</span><h2>Contenuto acquisito</h2></div><span className="statusPill neutral">Immutabile</span></div>
            <pre className="knowledgeText">{asset.originalText ?? 'L’originale è conservato presso il provider indicato dalla provenienza.'}</pre>
          </section>

          <section className="knowledgePanel flowPanel normalizedPanel">
            <div className="knowledgePanelHeading"><div><span className="panelEyebrow">2 · NORMALIZZATO</span><h2>Versione interrogabile</h2></div><span className="statusPill">{document?.documentType ?? 'PENDING'}</span></div>
            {document ? <>
              {document.summary ? <p className="knowledgeSummary">{document.summary}</p> : null}
              <pre className="knowledgeText">{document.normalizedText ?? 'Nessun testo normalizzato.'}</pre>
            </> : <p className="emptyLine">La trasformazione non è ancora disponibile.</p>}
          </section>
        </div>

        <section className="recentKnowledge unitsSection">
          <div className="sectionHeading"><h2>3 · Unità di conoscenza</h2><span>{units.length}</span></div>
          {units.length ? <div className="knowledgeUnits">
            {units.map((unit) => (
              <article className="knowledgeUnit" key={unit.id}>
                <div className="unitHeader"><span className="unitType">{unit.unitType}</span><span className="validationPill">{unit.validationStatus}</span>{unit.confidence !== null ? <small>{Math.round(unit.confidence * 100)}%</small> : null}</div>
                {unit.title ? <h3>{unit.title}</h3> : null}
                <p>{unit.content}</p>
              </article>
            ))}
          </div> : <p className="emptyLine">Nessuna unità estratta.</p>}
        </section>
      </main>

      <nav className="bottomNav" aria-label="Navigazione mobile"><a href="/planner"><span aria-hidden>◎</span><small>Oggi</small></a><a className="active" href="/knowledge"><span aria-hidden>◇</span><small>KB</small></a><button type="button" disabled><span aria-hidden>↓</span><small>Inbox</small></button><button type="button" disabled><span aria-hidden>▤</span><small>Documenti</small></button></nav>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(new Date(value))
}
