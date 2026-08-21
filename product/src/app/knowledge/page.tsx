import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { captureKnowledgeNote, uploadKnowledgeFile } from './actions'

export const dynamic = 'force-dynamic'

type PageProps = { searchParams: Promise<{ q?: string; upload?: string; category?: string; discipline?: string; classLabel?: string }> }

export default async function KnowledgePage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const uploadMessage = uploadFeedback(params.upload)
  const filters = { category: params.category?.trim(), discipline: params.discipline?.trim(), classLabel: params.classLabel?.trim() }

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const repository = new SupabaseKnowledgeRepository()
  const [recent, results] = await Promise.all([
    repository.listRecent(context.workspace.id, 50, filters),
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
          <Link className="navItem" href="/planner"><span aria-hidden>◎</span> Oggi</Link>
          <Link className="navItem active" href="/knowledge"><span aria-hidden>◇</span> Conoscenza</Link>
        </nav>
        <div className="navFooter"><span className="workspaceDot" aria-hidden /><div><strong>{context.workspace.name}</strong><span>{context.role}</span></div></div>
      </aside>

      <main className="workSurface knowledgeSurface">
        <header className="mobileHeader">
          <div><span className="mobileEyebrow">DOCENTE OS</span><strong>Conoscenza</strong></div>
          <Link className="iconButton knowledgeBack" href="/planner" aria-label="Torna al Planner">←</Link>
        </header>

        <section className="plannerHeader knowledgeHeader">
          <div>
            <p className="contextLine">{context.workspace.name} · Knowledge Base</p>
            <h1>Conoscenza</h1>
            <p className="dayLine">Ogni asset diventa contenuto ricercabile, tracciato e collegabile al lavoro.</p>
          </div>
        </section>

        {uploadMessage ? <div className="knowledgeFeedback" role="status">{uploadMessage}</div> : null}

        <div className="knowledgeGrid">
          <section className="knowledgePanel capturePanel">
            <div className="knowledgePanelHeading"><div><span className="panelEyebrow">INBOX</span><h2>Cattura conoscenza</h2></div><span className="statusPill">Originale preservato</span></div>

            <div className="captureModeBlock">
              <div className="captureModeHeading"><strong>Incolla testo</strong><span>Indicizzazione immediata</span></div>
              <form action={captureKnowledgeNote} className="knowledgeCaptureForm">
                <label><span>Titolo opzionale</span><input name="title" maxLength={180} placeholder="Es. Collegio docenti — appunti" /></label>
                <label><span>Contenuto originale</span><textarea name="text" rows={7} required placeholder="Incolla o scrivi qui. L’originale sarà conservato e trasformato nella KB…" /></label>
                <div className="pipelineHint"><span>Originale</span><b>→</b><span>Normalizzato</span><b>→</b><span>Unità KB</span><b>→</b><span>Indice</span></div>
                <button type="submit">Cattura e indicizza</button>
              </form>
            </div>

            <div className="captureDivider"><span>oppure</span></div>

            <div className="captureModeBlock">
              <div className="captureModeHeading"><strong>Carica file</strong><span>Bucket privato · max 20 MB</span></div>
              <form action={uploadKnowledgeFile} className="knowledgeUploadForm">
                <label className="fileDrop">
                  <input name="file" type="file" required accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp" />
                  <span className="fileDropIcon" aria-hidden>↑</span>
                  <strong>PDF, immagini, DOCX, TXT o Markdown</strong>
                  <small>L’originale resta nel bucket privato. L’OCR visivo viene usato solo per immagini, scansioni o pagine prive di testo utile.</small>
                </label>
                <button type="submit">Carica e trasforma</button>
              </form>
            </div>
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
                  <Link className="knowledgeResult" key={unit?.id ?? document.id} href={`/knowledge/${document.assetId}`}>
                    <strong>{document.title ?? 'Senza titolo'}</strong>
                    <span>{unit?.content ?? document.summary ?? 'Apri il documento'}</span>
                    <small>{unit?.unitType ?? document.documentType}</small>
                  </Link>
                )) : <p className="emptyLine">Nessuna corrispondenza nella KB.</p>}
              </div>
            ) : <>
              <p className="searchPlaceholder">La ricerca usa l’indice full-text italiano e rispetta l’isolamento del workspace.</p>
              <div className="kbPrinciples">
                <div><strong>Originale</strong><span>Mai sostituito dal derivato.</span></div>
                <div><strong>Provenienza</strong><span>Fonte e trasformazione sempre leggibili.</span></div>
                <div><strong>Validazione</strong><span>Azioni e scadenze richiedono conferma umana.</span></div>
              </div>
            </>}
          </section>
        </div>

        <section className="recentKnowledge">
          <div className="sectionHeading"><h2>Asset recenti</h2><span>{recent.length}</span></div>
          <form className="knowledgeFilters" action="/knowledge" method="get">
            <select name="category" defaultValue={filters.category ?? ''} aria-label="Filtra per tipologia"><option value="">Tutte le tipologie</option>{CONTENT_CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
            <input name="discipline" defaultValue={filters.discipline ?? ''} placeholder="Disciplina" aria-label="Filtra per disciplina" />
            <input name="classLabel" defaultValue={filters.classLabel ?? ''} placeholder="Classe, es. 2C" aria-label="Filtra per classe" />
            <button type="submit">Filtra</button>
          </form>
          {recent.length ? <div className="knowledgeAssetList">
            {recent.map(({ asset, document }) => (
              <Link key={asset.id} className="knowledgeAssetRow" href={`/knowledge/${asset.id}`}>
                <div className="assetIcon">{asset.assetKind === 'NOTE' ? 'N' : fileIcon(asset.mimeType)}</div>
                <div className="assetMain"><strong>{document?.title ?? asset.originalName ?? 'Asset senza titolo'}</strong><span>{document?.summary ?? asset.originalText?.slice(0, 150) ?? assetStatusLabel(asset.processingStatus)}</span><div className="assetContext"><small>{categoryLabel(asset.contentCategory)}</small>{asset.disciplines.map((item) => <small key={item}>{item}</small>)}{asset.classLabels.map((item) => <small key={item}>{item}</small>)}</div></div>
                <div className="assetMeta"><span className={`processingPill ${asset.processingStatus.toLowerCase()}`}>{asset.processingStatus}</span><small>{formatDate(asset.capturedAt)}</small></div>
              </Link>
            ))}
          </div> : <p className="emptyLine">La Knowledge Base è vuota. Cattura il primo contenuto.</p>}
        </section>
      </main>

      <nav className="bottomNav" aria-label="Navigazione mobile">
        <Link href="/planner"><span aria-hidden>◎</span><small>Oggi</small></Link>
        <Link className="active" href="/knowledge"><span aria-hidden>◇</span><small>KB</small></Link>
        <button type="button" disabled><span aria-hidden>↓</span><small>Inbox</small></button>
        <button type="button" disabled><span aria-hidden>▤</span><small>Documenti</small></button>
      </nav>
    </div>
  )
}

function uploadFeedback(code?: string) {
  if (!code) return null
  const messages: Record<string, string> = {
    missing: 'Seleziona un file da caricare.',
    too_large: 'Il file supera il limite di 20 MB.',
    unsupported: 'Formato non supportato. Usa PDF, DOCX, TXT o Markdown.',
    failed: 'Il caricamento non è riuscito. Riprova.',
    empty_text: 'Il file di testo non contiene contenuto indicizzabile.',
    parse_failed: 'L’originale è stato conservato, ma la trasformazione automatica non è riuscita. Il file resta disponibile per una nuova elaborazione.',
  }
  return messages[code] ?? null
}

function fileIcon(mimeType: string | null) {
  if (mimeType === 'application/pdf') return 'P'
  if (mimeType?.includes('wordprocessingml')) return 'W'
  if (mimeType?.startsWith('image/')) return 'I'
  return 'F'
}

function assetStatusLabel(status: string) {
  if (status === 'FAILED') return 'Originale conservato · trasformazione da ripetere'
  if (status === 'INDEXED') return 'Asset indicizzato nella Knowledge Base'
  return 'Asset acquisito nella Knowledge Base'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(value))
}

const CONTENT_CATEGORIES = [
  ['CIRCULAR', 'Circolare'], ['MODEL', 'Modello'], ['PROGRAMMING', 'Programmazione'], ['UDA', 'Unità di apprendimento'],
  ['ASSESSMENT', 'Verifica o valutazione'], ['TEACHING_RESOURCE', 'Risorsa didattica'], ['COMMUNICATION', 'Comunicazione'], ['OTHER', 'Altro'],
] as const

function categoryLabel(value: string) {
  return CONTENT_CATEGORIES.find(([key]) => key === value)?.[1] ?? value
}
