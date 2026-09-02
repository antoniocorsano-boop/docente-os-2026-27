import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseScaledKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-scaled-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  CONTENT_CATEGORIES,
  contentCategoryLabel,
  humanizeKnowledgeTitle,
  knowledgeProcessingStatus,
} from '@/core/presentation/product-language'
import { KnowledgeCaptureModes } from './KnowledgeCaptureModes'

export const dynamic = 'force-dynamic'

type PageProps = { searchParams: Promise<{ q?: string; upload?: string; category?: string; discipline?: string; classLabel?: string }> }

const RECENT_VISIBLE_COUNT = 8

export default async function KnowledgePage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const uploadMessage = uploadFeedback(params.upload)
  const filters = { category: params.category?.trim(), discipline: params.discipline?.trim(), classLabel: params.classLabel?.trim() }

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const repository = new SupabaseScaledKnowledgeRepository()
  const [recent, results] = await Promise.all([
    repository.listRecent(context.workspace.id, 50, filters),
    query ? repository.search(context.workspace.id, query, 30) : Promise.resolve([]),
  ])
  const recentVisible = recent.slice(0, RECENT_VISIBLE_COUNT)
  const recentMore = recent.slice(RECENT_VISIBLE_COUNT)
  const captureOpen = recent.length === 0 || Boolean(uploadMessage)

  const renderRecentRows = (items: typeof recent) => items.map(({ asset, document }) => {
    const status = knowledgeProcessingStatus(asset.processingStatus)
    return (
      <Link key={asset.id} className="knowledgeAssetRow" href={`/knowledge/${asset.id}`}>
        <div className="assetIcon">{asset.assetKind === 'NOTE' ? 'N' : fileIcon(asset.mimeType)}</div>
        <div className="assetMain"><strong>{humanizeKnowledgeTitle(document?.title ?? asset.originalName)}</strong><span>{document?.summary ?? asset.originalText?.slice(0, 150) ?? status.description}</span><div className="assetContext"><small>{contentCategoryLabel(asset.contentCategory)}</small>{asset.disciplines.map((item) => <small key={item}>{item}</small>)}{asset.classLabels.map((item) => <small key={item}>{item}</small>)}</div></div>
        <div className="assetMeta"><span className={`processingPill ${status.tone}`}>{status.label}</span><small>{formatDate(asset.capturedAt)}</small></div>
      </Link>
    )
  })

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

        <details className="knowledgePanel capturePanel knowledgeCaptureDisclosure" open={captureOpen}>
          <summary className="knowledgeCaptureSummary">
            <div>
              <span className="panelEyebrow">AGGIUNGI</span>
              <strong>Aggiungi un contenuto</strong>
              <small>Testo o file, con originale preservato.</small>
            </div>
            <span className="knowledgeCaptureSummaryAction" aria-hidden>{captureOpen ? 'Riduci' : 'Apri'}</span>
          </summary>
          <div className="knowledgeCaptureBody">
            <div className="knowledgeCaptureAssurance"><span className="statusPill">Originale preservato</span><p>Il contenuto entra nella Conoscenza solo quando scegli di aggiungerlo.</p></div>
            <KnowledgeCaptureModes />
          </div>
        </details>
      </div>

      <section className="recentKnowledge">
        <div className="sectionHeading"><h2>Contenuti recenti</h2><span>{recent.length}</span></div>
        <form className="knowledgeFilters" action="/knowledge" method="get">
          <select name="category" defaultValue={filters.category ?? ''} aria-label="Filtra per tipologia"><option value="">Tutte le tipologie</option>{CONTENT_CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          <input name="discipline" defaultValue={filters.discipline ?? ''} placeholder="Disciplina" aria-label="Filtra per disciplina" />
          <input name="classLabel" defaultValue={filters.classLabel ?? ''} placeholder="Classe, es. 2C" aria-label="Filtra per classe" />
          <button type="submit">Applica filtri</button>
        </form>
        {recent.length ? <>
          <div className="knowledgeAssetList knowledgeAssetListPrimary">
            {renderRecentRows(recentVisible)}
          </div>
          {recentMore.length ? (
            <details className="knowledgeRecentMore">
              <summary>Mostra altri {recentMore.length} contenuti</summary>
              <div className="knowledgeAssetList knowledgeAssetListMore">
                {renderRecentRows(recentMore)}
              </div>
            </details>
          ) : null}
        </> : <p className="emptyLine">Non ci sono ancora contenuti. Aggiungi un appunto o un file per iniziare a costruire la tua Conoscenza.</p>}
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
