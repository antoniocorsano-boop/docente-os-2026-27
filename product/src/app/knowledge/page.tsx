import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  CONTENT_CATEGORIES,
  contentCategoryLabel,
  humanizeKnowledgeTitle,
  knowledgeProcessingStatus,
} from '@/core/presentation/product-language'
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
    <AppShell
      active="knowledge"
      academicYearLabel={context.academicYear?.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="knowledgeSurface"
    >
      <section className="plannerHeader knowledgeHeader">
        <div>
          <p className="contextLine">{context.workspace.name} · Archivio professionale</p>
          <h1>Conoscenza</h1>
          <p className="dayLine">Raccogli documenti, appunti e fonti. DOCENTE OS li organizza senza perdere l’originale e ti aiuta a ritrovarli quando servono.</p>
        </div>
      </section>

      {uploadMessage ? <div className="knowledgeFeedback" role="status">{uploadMessage}</div> : null}

      <div className="knowledgeGrid">
        <section className="knowledgePanel capturePanel">
          <div className="knowledgePanelHeading"><div><span className="panelEyebrow">AGGIUNGI</span><h2>Porta un contenuto nella Conoscenza</h2></div><span className="statusPill">Originale preservato</span></div>

          <div className="captureModeBlock">
            <div className="captureModeHeading"><strong>Incolla un testo</strong><span>Pronto per la ricerca in pochi secondi</span></div>
            <form action={captureKnowledgeNote} className="knowledgeCaptureForm">
              <label><span>Titolo, se vuoi</span><input name="title" maxLength={180} placeholder="Es. Collegio docenti — appunti" /></label>
              <label><span>Contenuto</span><textarea name="text" rows={7} required placeholder="Incolla o scrivi qui. Conserverò il testo originale e lo organizzerò nella Conoscenza…" /></label>
              <div className="pipelineHint"><span>Originale</span><b>→</b><span>Contenuto leggibile</span><b>→</b><span>Informazioni utili</span><b>→</b><span>Ricerca</span></div>
              <button type="submit">Salva e organizza</button>
            </form>
          </div>

          <div className="captureDivider"><span>oppure</span></div>

          <div className="captureModeBlock">
            <div className="captureModeHeading"><strong>Carica un file</strong><span>Privato · massimo 20 MB</span></div>
            <form action={uploadKnowledgeFile} className="knowledgeUploadForm">
              <label className="fileDrop">
                <input name="file" type="file" required accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp" />
                <span className="fileDropIcon" aria-hidden>↑</span>
                <strong>PDF, immagini, DOCX, TXT o Markdown</strong>
                <small>L’originale resta nel tuo spazio privato. Per scansioni e immagini, il testo riconosciuto viene sempre trattato come contenuto da verificare.</small>
              </label>
              <button type="submit">Carica e organizza</button>
            </form>
          </div>
        </section>

        <section className="knowledgePanel searchPanel">
          <div className="knowledgePanelHeading"><div><span className="panelEyebrow">RITROVA</span><h2>Cerca nella Conoscenza</h2></div></div>
          <form className="knowledgeSearch" action="/knowledge" method="get">
            <input name="q" defaultValue={query} placeholder="Cerca un argomento, una scadenza, una classe…" />
            <button type="submit">Cerca</button>
          </form>
          {query ? (
            <div className="knowledgeResults">
              <p className="resultsLabel">{results.length} risultati per “{query}”</p>
              {results.length ? results.map(({ document, unit }) => (
                <Link className="knowledgeResult" key={unit?.id ?? document.id} href={`/knowledge/${document.assetId}`}>
                  <strong>{humanizeKnowledgeTitle(document.title)}</strong>
                  <span>{unit?.content ?? document.summary ?? 'Apri il contenuto per vedere i dettagli.'}</span>
                  <small>{unit ? 'Risultato nel contenuto' : 'Documento'}</small>
                </Link>
              )) : <p className="emptyLine">Non ho trovato corrispondenze. Prova con una parola più generale o controlla i contenuti recenti.</p>}
            </div>
          ) : <>
            <p className="searchPlaceholder">La ricerca lavora solo sui contenuti del tuo spazio docente.</p>
            <div className="kbPrinciples">
              <div><strong>Originale al sicuro</strong><span>Le elaborazioni non sostituiscono la fonte.</span></div>
              <div><strong>Provenienza leggibile</strong><span>Sai sempre da dove arriva un contenuto.</span></div>
              <div><strong>Conferma umana</strong><span>Azioni e scadenze diventano operative solo quando decidi tu.</span></div>
            </div>
          </>}
        </section>
      </div>

      <section className="recentKnowledge">
        <div className="sectionHeading"><h2>Contenuti recenti</h2><span>{recent.length}</span></div>
        <form className="knowledgeFilters" action="/knowledge" method="get">
          <select name="category" defaultValue={filters.category ?? ''} aria-label="Filtra per tipologia"><option value="">Tutte le tipologie</option>{CONTENT_CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          <input name="discipline" defaultValue={filters.discipline ?? ''} placeholder="Disciplina" aria-label="Filtra per disciplina" />
          <input name="classLabel" defaultValue={filters.classLabel ?? ''} placeholder="Classe, es. 2C" aria-label="Filtra per classe" />
          <button type="submit">Applica filtri</button>
        </form>
        {recent.length ? <div className="knowledgeAssetList">
          {recent.map(({ asset, document }) => {
            const status = knowledgeProcessingStatus(asset.processingStatus)
            return (
              <Link key={asset.id} className="knowledgeAssetRow" href={`/knowledge/${asset.id}`}>
                <div className="assetIcon">{asset.assetKind === 'NOTE' ? 'N' : fileIcon(asset.mimeType)}</div>
                <div className="assetMain"><strong>{humanizeKnowledgeTitle(document?.title ?? asset.originalName)}</strong><span>{document?.summary ?? asset.originalText?.slice(0, 150) ?? status.description}</span><div className="assetContext"><small>{contentCategoryLabel(asset.contentCategory)}</small>{asset.disciplines.map((item) => <small key={item}>{item}</small>)}{asset.classLabels.map((item) => <small key={item}>{item}</small>)}</div></div>
                <div className="assetMeta"><span className={`processingPill ${status.tone}`}>{status.label}</span><small>{formatDate(asset.capturedAt)}</small></div>
              </Link>
            )
          })}
        </div> : <p className="emptyLine">Non ci sono ancora contenuti. Aggiungi un appunto o un file per iniziare a costruire la tua Conoscenza.</p>}
      </section>
    </AppShell>
  )
}

function uploadFeedback(code?: string) {
  if (!code) return null
  const messages: Record<string, string> = {
    missing: 'Seleziona un file da caricare.',
    too_large: 'Il file supera il limite di 20 MB. Scegline uno più piccolo.',
    unsupported: 'Questo formato non è supportato. Usa PDF, immagini, DOCX, TXT o Markdown.',
    failed: 'Il caricamento non è riuscito. Nessun contenuto è stato sostituito: puoi riprovare.',
    empty_text: 'Il file non contiene testo utilizzabile per la ricerca.',
    parse_failed: 'L’originale è stato conservato, ma non sono riuscito a organizzarlo automaticamente. Puoi riprovare più tardi.',
  }
  return messages[code] ?? null
}

function fileIcon(mimeType: string | null) {
  if (mimeType === 'application/pdf') return 'P'
  if (mimeType?.includes('wordprocessingml')) return 'W'
  if (mimeType?.startsWith('image/')) return 'I'
  return 'F'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' }).format(new Date(value))
}
