import { redirect } from 'next/navigation'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { captureKnowledgeNote } from './actions'

export const dynamic = 'force-dynamic'

type PageProps = { searchParams: Promise<{ q?: string }> }

export default async function KnowledgePage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const repository = new SupabaseKnowledgeRepository()
  const [recent, results] = await Promise.all([
    repository.listRecent(context.workspace.id, 20),
    query ? repository.search(context.workspace.id, query, 30) : Promise.resolve([]),
  ])

  return (
    <div className="appShell">
      <aside className="navRail" aria-label="Navigazione principale">
        <div className="brandLockup">
          <span className="brandMark">D</span>
          <div><strong>DOCENTE OS</strong><span>{context.academicYear?.label ?? 'Anno da configurare'}</span></div>
        </div>
        <nav className="navList">
          <a className="navItem" href="/planner"><span aria-hidden>◎</span> Oggi</a>
          <a className="navItem active" href="/knowledge"><span aria-hidden>◇</span> Conoscenza</a>
        </nav>
        <div className="navFooter"><span className="workspaceDot" aria-hidden /><div><strong>{context.workspace.name}</strong><span>{context.role}</span></div></div>
      </aside>

      <main className="workSurface knowledgeSurface">
        <header className="mobileHeader">
          <div><span className="mobileEyebrow">DOCENTE OS</span><strong>Conoscenza</strong></div>
          <a className="iconButton knowledgeBack" href="/planner" aria-label="Torna al Planner">←</a>
        </header>

        <section className="plannerHeader knowledgeHeader">
          <div>
            <p className="contextLine">{context.workspace.name} · Knowledge Base</p>
            <h1>Conoscenza</h1>
            <p className="dayLine">Ogni asset diventa contenuto ricercabile, tracciato e collegabile al lavoro.</p>
          </div>
        </section>

        <div className="knowledgeGrid">
          <section className="knowledgePanel capturePanel">
            <div className="knowledgePanelHeading"><div><span className="panelEyebrow">INBOX</span><h2>Cattura una nota</h2></div><span className="statusPill">Trasformazione automatica</span></div>
            <form action={captureKnowledgeNote} className="knowledgeCaptureForm">
              <label><span>Titolo opzionale</span><input name="title" maxLength={180} placeholder="Es. Collegio docenti — appunti" /></label>
              <label><span>Contenuto originale</span><textarea name="text" rows={8} required placeholder="Incolla o scrivi qui. L’originale sarà conservato e trasformato nella KB…" /></label>
              <div className="pipelineHint"><span>Originale</span><b>→</b><span>Normalizzato</span><b>→</b><span>Unità KB</span><b>→</b><span>Indice</span></div>
              <button type="submit">Cattura e indicizza</button>
            </form>
          </section>

          <section className="knowledgePanel searchPanel">
            <div className="knowledgePanelHeading"><div><span className="panelEyebrow">RICERCA</span><h2>Interroga la KB</h2></div></div>
            <form className="knowledgeSearch" action="/knowledge" method="get">
              <input name="q" defaultValue={query} placeholder="Cerca scadenze, attività, argomenti…" />
              <button type="submit">Cerca</button>
            </form>
            {query ? (
              <div className="knowledgeResults">
                <p className="resultsLabel">{results.length} risultati per “{query}”</p>
                {results.length ? results.map(({ document, unit }) => (
                  <a className="knowledgeResult" key={unit?.id ?? document.id} href={`/knowledge/${document.assetId}`}>
                    <strong>{document.title ?? 'Senza titolo'}</strong>
                    <span>{unit?.content ?? document.summary ?? 'Apri il documento'}</span>
                    <small>{unit?.unitType ?? document.documentType}</small>
                  </a>
                )) : <p className="emptyLine">Nessuna corrispondenza nella KB.</p>}
              </div>
            ) : <p className="searchPlaceholder">La ricerca usa l’indice full-text italiano e rispetta l’isolamento del workspace.</p>}
          </section>
        </div>

        <section className="recentKnowledge">
          <div className="sectionHeading"><h2>Asset recenti</h2><span>{recent.length}</span></div>
          {recent.length ? <div className="knowledgeAssetList">
            {recent.map(({ asset, document }) => (
              <a key={asset.id} className="knowledgeAssetRow" href={`/knowledge/${asset.id}`}>
                <div className="assetIcon">{asset.assetKind === 'NOTE' ? 'N' : 'F'}</div>
                <div className="assetMain"><strong>{document?.title ?? asset.originalName ?? 'Asset senza titolo'}</strong><span>{document?.summary ?? asset.originalText?.slice(0, 150) ?? asset.sourceProvider}</span></div>
                <div className="assetMeta"><span className={`processingPill ${asset.processingStatus.toLowerCase()}`}>{asset.processingStatus}</span><small>{formatDate(asset.capturedAt)}</small></div>
              </a>
            ))}
          </div> : <p className="emptyLine">La Knowledge Base è vuota. Cattura la prima nota.</p>}
        </section>
      </main>

      <nav className="bottomNav" aria-label="Navigazione mobile">
        <a href="/planner"><span aria-hidden>◎</span><small>Oggi</small></a>
        <a className="active" href="/knowledge"><span aria-hidden>◇</span><small>KB</small></a>
        <button type="button" disabled><span aria-hidden>↓</span><small>Inbox</small></button>
        <button type="button" disabled><span aria-hidden>▤</span><small>Documenti</small></button>
      </nav>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(value))
}
