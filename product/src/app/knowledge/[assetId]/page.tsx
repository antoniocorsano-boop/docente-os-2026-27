import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import {
  CONTENT_CATEGORIES,
  assetKindLabel,
  contentCategoryLabel,
  contextStatusLabel,
  documentTypeLabel,
  generationStatusLabel,
  humanizeKnowledgeTitle,
  knowledgeProcessingStatus,
  reliabilityLabel,
  sourceProviderLabel,
  unitTypeLabel,
  validationStatusLabel,
} from '@/core/presentation/product-language'
import { asKnowledgeTaskMode, sanitizeInternalReturnTo } from '@/core/presentation/task-continuity'
import { confirmKnowledgeAction, confirmKnowledgeCandidate, createPlannerTaskFromKnowledgeAsset, rejectKnowledgeCandidate, reprocessKnowledgeAsset, updateKnowledgeContext } from '../actions'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ assetId: string }>
  searchParams: Promise<{
    reprocess?: string
    context?: string
    task?: string
    mode?: string
    returnTo?: string
    section?: string
    block?: string
  }>
}

export default async function KnowledgeAssetPage({ params, searchParams }: PageProps) {
  const { assetId } = await params
  const query = await searchParams
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const repository = new SupabaseKnowledgeRepository()
  const bundle = await repository.getBundle(context.workspace.id, assetId)
  if (!bundle) notFound()

  const { asset, document, units, generations } = bundle
  const driveUrl = asset.sourceProvider === 'DRIVE' && typeof asset.sourceMetadata.driveUrl === 'string' ? asset.sourceMetadata.driveUrl : null
  const currentGeneration = generations.find((generation) => generation.id === asset.currentGenerationId) ?? null
  const displayTitle = humanizeKnowledgeTitle(document?.title ?? asset.originalName)
  const processing = knowledgeProcessingStatus(asset.processingStatus)
  const sourceLabel = sourceProviderLabel(asset.sourceProvider)
  const category = contentCategoryLabel(asset.contentCategory)
  const contextReference = [...asset.disciplines, ...asset.classLabels].join(' · ') || 'Da completare'
  const taskMode = asKnowledgeTaskMode(query.mode)

  if (taskMode) {
    const returnTo = sanitizeInternalReturnTo(query.returnTo, '/knowledge')
    const returnLabel = taskMode === 'prepare' ? 'Torna alla preparazione' : 'Torna alla classe'
    const focusLabel = taskMode === 'prepare' ? 'RISORSA NELLA PREPARAZIONE' : 'RISORSA DELLA CLASSE'
    const normalizedText = document?.normalizedText?.trim() ?? ''
    const fallbackUnits = units
      .filter((unit) => unit.unitType !== 'ACTION' && unit.unitType !== 'DEADLINE')
      .slice(0, 12)
      .map((unit) => `${unit.title ? `${unit.title}\n` : ''}${unit.content}`)
      .join('\n\n')
    const readableText = normalizedText || fallbackUnits

    return (
      <AppShell
        active="knowledge"
        academicYearLabel={context.academicYear?.label}
        workspaceName={context.workspace.name}
        role={context.role}
        contentClassName="knowledgeSurface focusedKnowledgeSurface"
      >
        <nav className="focusedKnowledgeContext" aria-label="Contesto del compito">
          <Link href={returnTo}>← {returnLabel}</Link>
          <span>{query.block ? `${query.block} · ` : ''}{contextReference}</span>
        </nav>

        <section className="focusedKnowledgeHero">
          <p>{focusLabel}</p>
          <h1>{displayTitle}</h1>
          <p className="focusedKnowledgeSummary">{document?.summary ?? (asset.contentCategory === 'UDA' ? 'Consulta il percorso, le attività e le evidenze utili per la fase che stai preparando.' : 'Questa risorsa è stata aperta dentro il tuo compito corrente: DOCENTE OS mantiene il contesto finché non scegli di uscirne.')}</p>
          <div className="focusedKnowledgeMeta">
            <span>{category}</span>
            <span>{sourceLabel}</span>
            <span>{processing.label}</span>
            {query.block ? <span>{query.block}</span> : null}
          </div>
        </section>

        <section className="focusedKnowledgeUse" aria-labelledby="focused-use-title">
          <header><span>USA ADESSO</span><h2 id="focused-use-title">{asset.contentCategory === 'UDA' ? 'Percorso operativo' : 'Contenuto della risorsa'}</h2></header>
          {readableText ? <pre className="focusedKnowledgeText">{readableText}</pre> : <p className="focusedKnowledgeEmpty">Il contenuto leggibile non è ancora disponibile. La risorsa resta collegata al compito e puoi aprire la scheda completa per controllarne lo stato.</p>}
        </section>

        <nav className="focusedKnowledgeActions" aria-label="Continua il compito">
          <Link className="primary" href={returnTo}>{returnLabel}</Link>
          {driveUrl ? <a href={driveUrl} target="_blank" rel="noreferrer">Apri fonte originale</a> : null}
        </nav>

        <details className="humanTaskSecondary focusedKnowledgeManage">
          <summary>Gestisci o approfondisci questa risorsa</summary>
          <div className="humanTaskSecondaryBody">
            <p>Esci dalla modalità operativa solo se devi modificare contesto, creare attività, verificare estrazioni o consultare versioni e provenienza.</p>
            <Link href={`/knowledge/${encodeURIComponent(asset.id)}`}>Apri la scheda completa di Conoscenza →</Link>
          </div>
        </details>
      </AppShell>
    )
  }

  const candidates = units.filter((unit) => unit.unitType === 'ACTION' || unit.unitType === 'DEADLINE')
  const chunks = units.filter((unit) => unit.unitType !== 'ACTION' && unit.unitType !== 'DEADLINE')
  const taskLinks = new Map<string, string>()

  await Promise.all(candidates.filter((unit) => unit.unitType === 'ACTION').map(async (unit) => {
    const target = await repository.findTargetRef({
      workspaceId: context.workspace.id,
      unitId: unit.id,
      relationType: 'CREATED_TASK',
      targetType: 'PLANNER_TASK',
    })
    if (target) taskLinks.set(unit.id, target)
  }))

  const candidateSummary = candidates.length
    ? `Ho trovato ${candidates.length} ${candidates.length === 1 ? 'possibile azione o scadenza' : 'possibili azioni o scadenze'}. Restano proposte finché non le confermi.`
    : asset.contextStatus === 'REVIEWED'
      ? 'Il contenuto è organizzato e il contesto professionale è stato controllato. Puoi usarlo nel lavoro o trasformarlo in una attività concreta.'
      : 'Il contenuto è organizzato. Ti consiglio di controllare il contesto professionale prima di usarlo nel lavoro.'

  return (
    <AppShell
      active="knowledge"
      academicYearLabel={context.academicYear?.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="knowledgeSurface detailSurface"
    >
      <div className="detailTopbar">
        <Link href="/knowledge">← Torna alla Conoscenza</Link>
        <span className={`processingPill ${processing.tone}`}>{processing.label}</span>
      </div>

      {query.reprocess === 'ok' ? <div className="knowledgeFeedback success" role="status">Analisi aggiornata. L’originale è rimasto invariato e questa è ora la versione di lavoro corrente.</div> : null}
      {query.reprocess === 'failed' ? <div className="knowledgeFeedback error" role="status">Non sono riuscito ad aggiornare l’analisi. La versione precedente resta disponibile e l’originale non è stato modificato.</div> : null}
      {query.context === 'updated' ? <div className="knowledgeFeedback success" role="status">Contesto professionale aggiornato. Da ora questo contenuto sarà più facile da ritrovare e collegare al lavoro.</div> : null}
      {query.task === 'unavailable' ? <div className="knowledgeFeedback error" role="status">Non posso ancora creare l’attività perché manca una versione di analisi completata. Il contenuto resta comunque disponibile.</div> : null}

      <section className="plannerHeader knowledgeHeader humanKnowledgeHeader">
        <div>
          <p className="contextLine">{category} · {sourceLabel}</p>
          <h1>{displayTitle}</h1>
          <p className="dayLine">{sourceLabel === 'DOCENTE OS' ? 'Creato' : 'Acquisito'} {formatDate(asset.capturedAt)}</p>
        </div>
        <div className={`knowledgeStateCard ${processing.tone}`}>
          <strong>{processing.label}</strong>
          <span>{processing.description}</span>
        </div>
      </section>

      <section className="provenanceBar humanProvenance" aria-label="Contesto del contenuto">
        <div><span>Provenienza</span><strong>{sourceLabel}</strong></div>
        <div><span>Tipologia</span><strong>{category}</strong></div>
        <div><span>Riferimento</span><strong>{contextReference}</strong></div>
        <div><span>Stato</span><strong>{processing.label}</strong></div>
      </section>

      {driveUrl ? <a className="driveSourceLink" href={driveUrl} target="_blank" rel="noreferrer"><span>↗</span><div><strong>Apri la fonte originale in Google Drive</strong><small>Puoi consultarla in qualsiasi momento. Le elaborazioni di DOCENTE OS non modificano l’originale.</small></div></a> : null}

      <section className="knowledgeGuidance" aria-labelledby="knowledge-guidance-title">
        <div className="guidanceLead">
          <span className="panelEyebrow">TI AIUTO DA QUI</span>
          <h2 id="knowledge-guidance-title">Cosa puoi fare con questo contenuto</h2>
          <p>{candidateSummary}</p>
        </div>
        <div className="guidanceActions">
          <a href="#professional-context">Controlla il contesto</a>
          <a href="#planner-action">Crea attività</a>
          <a href="#content-view">Leggi il contenuto</a>
          <form action={reprocessKnowledgeAsset}>
            <input type="hidden" name="assetId" value={asset.id} />
            <button type="submit">Aggiorna analisi</button>
          </form>
        </div>
        <p className="guidanceSafety">Quando aggiorni l’analisi, l’originale e le versioni precedenti restano conservati.</p>
      </section>

      <section className="knowledgePanel contextPanel" id="professional-context">
        <div className="knowledgePanelHeading"><div><span className="panelEyebrow">CONTESTO PROFESSIONALE</span><h2>Dove userai questo contenuto</h2></div><span className={`validationPill ${asset.contextStatus === 'REVIEWED' ? 'reviewed' : ''}`}>{contextStatusLabel(asset.contextStatus)}</span></div>
        <p className="panelIntro">Classe, disciplina e tipologia aiutano DOCENTE OS a proporti questo contenuto nel momento giusto. La fonte originale non viene modificata.</p>
        <form action={updateKnowledgeContext} className="contextForm">
          <input type="hidden" name="assetId" value={asset.id} />
          <label><span>Anno scolastico</span><select name="academicYearId" defaultValue={asset.academicYearId ?? ''}><option value="">Non associato</option>{context.academicYear ? <option value={context.academicYear.id}>{context.academicYear.label}</option> : null}</select></label>
          <label><span>Tipologia</span><select name="contentCategory" defaultValue={asset.contentCategory}>{CONTENT_CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label><span>Discipline</span><input name="disciplines" defaultValue={asset.disciplines.join(', ')} placeholder="Tecnologia, Educazione civica" /></label>
          <label><span>Classi e sezioni</span><input name="classLabels" defaultValue={asset.classLabels.join(', ')} placeholder="1A, 2C, 3E" /></label>
          <label><span>Stato del controllo</span><select name="contextStatus" defaultValue={asset.contextStatus}><option value="UNCLASSIFIED">Da classificare</option><option value="NEEDS_REVIEW">Da controllare</option><option value="REVIEWED">Controllato</option></select></label>
          <label><span>Attendibilità</span><select name="reliability" defaultValue={asset.reliability}><option value="AUTO">Automatica</option><option value="TO_VERIFY">Da verificare</option><option value="VERIFIED">Verificata</option></select></label>
          <button type="submit">Salva contesto</button>
        </form>
        <p className="contextHint">Separa più discipline o classi con una virgola. Puoi correggere questo contesto in qualsiasi momento.</p>
      </section>

      <section className="knowledgePanel taskCreatorPanel" id="planner-action">
        <div className="knowledgePanelHeading"><div><span className="panelEyebrow">DAL CONTENUTO ALL’AZIONE</span><h2>Crea un’attività</h2></div><span className="statusPill">{currentGeneration ? 'Disponibile' : 'Non disponibile'}</span></div>
        <p>Trasforma questo contenuto in qualcosa che devi fare. L’attività comparirà in <strong>Oggi</strong> e manterrà il collegamento alla fonte. Non modifica il <strong>Piano annuale</strong> e non crea un evento nel <strong>Calendario</strong>.</p>
        <form action={createPlannerTaskFromKnowledgeAsset} className="taskCreatorForm">
          <input type="hidden" name="assetId" value={asset.id} />
          <label><span>Attività</span><input name="title" maxLength={240} defaultValue={`Esamina: ${displayTitle}`} required /></label>
          <label><span>Quando farla</span><input name="plannedFor" type="date" /></label>
          <label><span>Priorità</span><select name="priority" defaultValue={asset.contextStatus === 'NEEDS_REVIEW' ? 'HIGH' : 'NORMAL'}><option value="NORMAL">Normale</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option><option value="LOW">Bassa</option></select></label>
          <button type="submit" disabled={!currentGeneration}>Aggiungi alle attività</button>
        </form>
      </section>

      <div className="knowledgeFlowGrid" id="content-view">
        <section className="knowledgePanel flowPanel originalPanel">
          <div className="knowledgePanelHeading"><div><span className="panelEyebrow">FONTE ORIGINALE</span><h2>Contenuto acquisito</h2></div><span className="statusPill neutral">Preservato</span></div>
          <pre className="knowledgeText">{asset.originalText ?? (asset.sourceProvider === 'UPLOAD' ? 'Il file originale è conservato nel tuo spazio privato.' : 'L’originale è conservato presso la fonte indicata nella provenienza.')}</pre>
        </section>

        <section className="knowledgePanel flowPanel normalizedPanel">
          <div className="knowledgePanelHeading"><div><span className="panelEyebrow">CONTENUTO ORGANIZZATO</span><h2>Versione leggibile e ricercabile</h2></div><span className="statusPill">{document ? documentTypeLabel(document.documentType) : 'In preparazione'}</span></div>
          {document ? <>
            {document.summary ? <p className="knowledgeSummary">{document.summary}</p> : null}
            <pre className="knowledgeText">{document.normalizedText ?? 'Non c’è ancora testo organizzato da mostrare.'}</pre>
          </> : <p className="emptyLine">Non ho ancora una versione organizzata. L’originale resta disponibile e puoi aggiornare l’analisi più tardi.</p>}
        </section>
      </div>

      <section className="recentKnowledge candidateSection">
        <div className="sectionHeading"><h2>Proposte da verificare</h2><span>{candidates.length}</span></div>
        <p className="candidateIntro">{candidates.length ? 'Queste proposte derivano dal contenuto che ho letto. Controllale: diventano operative solo quando confermi tu.' : 'Non ho trovato azioni o scadenze da proporti in questo contenuto.'}</p>
        {candidates.length ? <div className="candidateGrid">
          {candidates.map((unit) => {
            const linkedTask = taskLinks.get(unit.id)
            return (
              <article className={`knowledgeCandidate ${unit.validationStatus.toLowerCase()}`} key={unit.id}>
                <div className="candidateHeader">
                  <div><span className={`candidateType ${unit.unitType.toLowerCase()}`}>{unit.unitType === 'ACTION' ? 'Azione proposta' : 'Scadenza proposta'}</span>{unit.confidence !== null ? <small>Stima automatica {Math.round(unit.confidence * 100)}%</small> : null}</div>
                  <span className={`validationPill ${unit.validationStatus.toLowerCase()}`}>{validationStatusLabel(unit.validationStatus)}</span>
                </div>
                {unit.title ? <h3>{unit.title}</h3> : null}
                <p>{unit.content}</p>
                {typeof unit.structuredData.dueDate === 'string' ? <p className="candidateDate">Data associata: <strong>{formatIsoDate(unit.structuredData.dueDate)}</strong></p> : null}
                {typeof unit.structuredData.date === 'string' ? <p className="candidateDate">Data rilevata: <strong>{formatIsoDate(unit.structuredData.date)}</strong></p> : null}
                {linkedTask ? <div className="candidateOutcome"><span>✓</span><div><strong>Attività già creata</strong><Link href="/planner">Vai a Oggi</Link></div></div> : null}
                {unit.validationStatus === 'AUTO' ? <div className="candidateActions">
                  {unit.unitType === 'ACTION' ? (
                    <form action={confirmKnowledgeAction}><input type="hidden" name="unitId" value={unit.id} /><button className="primaryCandidateAction" type="submit">Conferma e crea attività</button></form>
                  ) : (
                    <form action={confirmKnowledgeCandidate}><input type="hidden" name="unitId" value={unit.id} /><button className="primaryCandidateAction" type="submit">Conferma scadenza</button></form>
                  )}
                  <form action={rejectKnowledgeCandidate}><input type="hidden" name="unitId" value={unit.id} /><button className="secondaryCandidateAction" type="submit">Scarta proposta</button></form>
                </div> : null}
              </article>
            )
          })}
        </div> : null}
      </section>

      <section className="recentKnowledge unitsSection">
        <div className="sectionHeading"><h2>Informazioni organizzate</h2><span>{chunks.length}</span></div>
        {chunks.length ? <div className="knowledgeUnits">
          {chunks.map((unit) => (
            <article className="knowledgeUnit" key={unit.id}>
              <div className="unitHeader"><span className="unitType">{unitTypeLabel(unit.unitType)}</span>{unit.sourcePage ? <span className="sourcePagePill">Pag. {unit.sourcePage}</span> : null}{unit.structuredData.extractionMethod === 'VISUAL_OCR' ? <span className="visualExtractionPill">Da immagine · verifica consigliata</span> : null}<span className="validationPill">{validationStatusLabel(unit.validationStatus)}</span>{unit.confidence !== null ? <small>Stima {Math.round(unit.confidence * 100)}%</small> : null}</div>
              {unit.title ? <h3>{unit.title}</h3> : null}
              <p>{unit.content}</p>
            </article>
          ))}
        </div> : <p className="emptyLine">Non ci sono altre informazioni organizzate da mostrare.</p>}
      </section>

      <details className="technicalDetails">
        <summary><span><strong>Dettagli tecnici</strong><small>Versioni, codici interni e processore</small></span><b aria-hidden>＋</b></summary>
        <div className="technicalDetailsBody">
          <section className="provenanceBar technicalProvenance" aria-label="Dettagli tecnici della provenienza">
            <div><span>Provider</span><strong>{asset.sourceProvider}</strong></div>
            <div><span>Tipo asset</span><strong>{asset.assetKind} · {assetKindLabel(asset.assetKind)}</strong></div>
            <div><span>Generazione corrente</span><strong>{currentGeneration ? `#${currentGeneration.generationNo}` : '—'}</strong></div>
            <div><span>Processore</span><strong>{document?.processingVersion ?? 'Non ancora disponibile'}</strong></div>
          </section>
          <div className="technicalMetaLine"><span>Stato interno: <strong>{asset.processingStatus}</strong></span><span>Contesto: <strong>{asset.contextStatus}</strong></span><span>Attendibilità: <strong>{asset.reliability} · {reliabilityLabel(asset.reliability)}</strong></span></div>
          <section className="generationSection">
            <div className="sectionHeading"><h2>Versioni dell’analisi</h2><span>{generations.length}</span></div>
            <div className="generationList">
              {generations.map((generation) => (
                <div className={`generationRow ${generation.status.toLowerCase()}`} key={generation.id}>
                  <div><strong>Versione #{generation.generationNo}</strong><span>{generation.processorLabel ?? 'Elaborazione non completata'}</span></div>
                  <div><span className={`validationPill ${generation.status === 'SUCCEEDED' ? 'reviewed' : generation.status === 'FAILED' ? 'rejected' : ''}`}>{generationStatusLabel(generation.status)}</span><small>{formatDate(generation.startedAt)}</small>{generation.id === asset.currentGenerationId ? <b>Corrente</b> : null}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </details>
    </AppShell>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(new Date(value))
}

function formatIsoDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}
