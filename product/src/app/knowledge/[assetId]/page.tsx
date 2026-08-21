import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { confirmKnowledgeAction, confirmKnowledgeCandidate, rejectKnowledgeCandidate, reprocessKnowledgeAsset } from '../actions'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ assetId: string }>
  searchParams: Promise<{ reprocess?: string }>
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
  const currentGeneration = generations.find((generation) => generation.id === asset.currentGenerationId) ?? null
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

  return (
    <div className="appShell">
      <aside className="navRail" aria-label="Navigazione principale">
        <div className="brandLockup"><span className="brandMark">D</span><div><strong>DOCENTE OS</strong><span>{context.academicYear?.label ?? 'Anno da configurare'}</span></div></div>
        <nav className="navList"><Link className="navItem" href="/planner"><span aria-hidden>◎</span> Oggi</Link><Link className="navItem active" href="/knowledge"><span aria-hidden>◇</span> Conoscenza</Link></nav>
        <div className="navFooter"><span className="workspaceDot" aria-hidden /><div><strong>{context.workspace.name}</strong><span>{context.role}</span></div></div>
      </aside>

      <main className="workSurface knowledgeSurface detailSurface">
        <header className="mobileHeader"><div><span className="mobileEyebrow">KNOWLEDGE BASE</span><strong>Dettaglio asset</strong></div><Link className="iconButton knowledgeBack" href="/knowledge" aria-label="Torna alla KB">←</Link></header>

        <div className="detailTopbar">
          <Link href="/knowledge">← Torna alla Conoscenza</Link>
          <div className="detailActions">
            <span className={`processingPill ${asset.processingStatus.toLowerCase()}`}>{asset.processingStatus}</span>
            <form action={reprocessKnowledgeAsset}>
              <input type="hidden" name="assetId" value={asset.id} />
              <button className="secondaryCandidateAction" type="submit">Rielabora</button>
            </form>
          </div>
        </div>

        {query.reprocess === 'ok' ? <div className="knowledgeFeedback success" role="status">Nuova generazione elaborata e promossa come corrente.</div> : null}
        {query.reprocess === 'failed' ? <div className="knowledgeFeedback error" role="status">La nuova elaborazione non è riuscita. La generazione precedente resta attiva.</div> : null}

        <section className="plannerHeader knowledgeHeader">
          <div><p className="contextLine">{asset.sourceProvider} · {asset.assetKind}</p><h1>{document?.title ?? asset.originalName ?? 'Asset senza titolo'}</h1><p className="dayLine">Acquisito {formatDate(asset.capturedAt)}</p></div>
        </section>

        <section className="provenanceBar" aria-label="Provenienza">
          <div><span>Fonte</span><strong>{asset.sourceProvider}</strong></div>
          <div><span>Tipo</span><strong>{asset.assetKind}</strong></div>
          <div><span>Generazione</span><strong>{currentGeneration ? `#${currentGeneration.generationNo}` : '—'}</strong></div>
          <div><span>Processore</span><strong>{document?.processingVersion ?? 'Non ancora elaborato'}</strong></div>
        </section>

        <div className="knowledgeFlowGrid">
          <section className="knowledgePanel flowPanel originalPanel">
            <div className="knowledgePanelHeading"><div><span className="panelEyebrow">1 · ORIGINALE</span><h2>Contenuto acquisito</h2></div><span className="statusPill neutral">Immutabile</span></div>
            <pre className="knowledgeText">{asset.originalText ?? (asset.sourceProvider === 'UPLOAD' ? 'L’originale binario è conservato nel bucket privato del workspace.' : 'L’originale è conservato presso il provider indicato dalla provenienza.')}</pre>
          </section>

          <section className="knowledgePanel flowPanel normalizedPanel">
            <div className="knowledgePanelHeading"><div><span className="panelEyebrow">2 · NORMALIZZATO</span><h2>Versione interrogabile</h2></div><span className="statusPill">{document?.documentType ?? 'PENDING'}</span></div>
            {document ? <>
              {document.summary ? <p className="knowledgeSummary">{document.summary}</p> : null}
              <pre className="knowledgeText">{document.normalizedText ?? 'Nessun testo normalizzato.'}</pre>
            </> : <p className="emptyLine">La trasformazione non è ancora disponibile.</p>}
          </section>
        </div>

        <section className="recentKnowledge generationSection">
          <div className="sectionHeading"><h2>Generazioni di elaborazione</h2><span>{generations.length}</span></div>
          <div className="generationList">
            {generations.map((generation) => (
              <div className={`generationRow ${generation.status.toLowerCase()}`} key={generation.id}>
                <div><strong>Generazione #{generation.generationNo}</strong><span>{generation.processorLabel ?? 'Elaborazione non completata'}</span></div>
                <div><span className={`validationPill ${generation.status === 'SUCCEEDED' ? 'reviewed' : generation.status === 'FAILED' ? 'rejected' : ''}`}>{generationStatusLabel(generation.status)}</span><small>{formatDate(generation.startedAt)}</small>{generation.id === asset.currentGenerationId ? <b>Corrente</b> : null}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="recentKnowledge candidateSection">
          <div className="sectionHeading"><h2>3 · Candidati operativi</h2><span>{candidates.length}</span></div>
          <p className="candidateIntro">Sono proposte estratte automaticamente. Nessuna attività viene creata senza conferma.</p>
          {candidates.length ? <div className="candidateGrid">
            {candidates.map((unit) => {
              const linkedTask = taskLinks.get(unit.id)
              return (
                <article className={`knowledgeCandidate ${unit.validationStatus.toLowerCase()}`} key={unit.id}>
                  <div className="candidateHeader">
                    <div><span className={`candidateType ${unit.unitType.toLowerCase()}`}>{unit.unitType === 'ACTION' ? 'Azione candidata' : 'Scadenza candidata'}</span>{unit.confidence !== null ? <small>Confidenza {Math.round(unit.confidence * 100)}%</small> : null}</div>
                    <span className={`validationPill ${unit.validationStatus.toLowerCase()}`}>{validationLabel(unit.validationStatus)}</span>
                  </div>
                  {unit.title ? <h3>{unit.title}</h3> : null}
                  <p>{unit.content}</p>
                  {typeof unit.structuredData.dueDate === 'string' ? <p className="candidateDate">Data associata: <strong>{formatIsoDate(unit.structuredData.dueDate)}</strong></p> : null}
                  {typeof unit.structuredData.date === 'string' ? <p className="candidateDate">Data rilevata: <strong>{formatIsoDate(unit.structuredData.date)}</strong></p> : null}
                  {linkedTask ? <div className="candidateOutcome"><span>✓</span><div><strong>Task Planner creato</strong><Link href="/planner">Apri Planner</Link></div></div> : null}
                  {unit.validationStatus === 'AUTO' ? <div className="candidateActions">
                    {unit.unitType === 'ACTION' ? (
                      <form action={confirmKnowledgeAction}><input type="hidden" name="unitId" value={unit.id} /><button className="primaryCandidateAction" type="submit">Conferma e crea task</button></form>
                    ) : (
                      <form action={confirmKnowledgeCandidate}><input type="hidden" name="unitId" value={unit.id} /><button className="primaryCandidateAction" type="submit">Conferma scadenza</button></form>
                    )}
                    <form action={rejectKnowledgeCandidate}><input type="hidden" name="unitId" value={unit.id} /><button className="secondaryCandidateAction" type="submit">Scarta</button></form>
                  </div> : null}
                </article>
              )
            })}
          </div> : <p className="emptyLine">Nessuna azione o scadenza candidata rilevata.</p>}
        </section>

        <section className="recentKnowledge unitsSection">
          <div className="sectionHeading"><h2>4 · Unità di conoscenza</h2><span>{chunks.length}</span></div>
          {chunks.length ? <div className="knowledgeUnits">
            {chunks.map((unit) => (
              <article className="knowledgeUnit" key={unit.id}>
                <div className="unitHeader"><span className="unitType">{unit.unitType}</span>{unit.sourcePage ? <span className="sourcePagePill">Pag. {unit.sourcePage}</span> : null}<span className="validationPill">{unit.validationStatus}</span>{unit.confidence !== null ? <small>{Math.round(unit.confidence * 100)}%</small> : null}</div>
                {unit.title ? <h3>{unit.title}</h3> : null}
                <p>{unit.content}</p>
              </article>
            ))}
          </div> : <p className="emptyLine">Nessuna ulteriore unità estratta.</p>}
        </section>
      </main>

      <nav className="bottomNav" aria-label="Navigazione mobile"><Link href="/planner"><span aria-hidden>◎</span><small>Oggi</small></Link><Link className="active" href="/knowledge"><span aria-hidden>◇</span><small>KB</small></Link><button type="button" disabled><span aria-hidden>↓</span><small>Inbox</small></button><button type="button" disabled><span aria-hidden>▤</span><small>Documenti</small></button></nav>
    </div>
  )
}

function validationLabel(value: string) {
  if (value === 'REVIEWED') return 'Confermato'
  if (value === 'REJECTED') return 'Scartato'
  return 'Da verificare'
}

function generationStatusLabel(value: string) {
  if (value === 'SUCCEEDED') return 'Riuscita'
  if (value === 'FAILED') return 'Fallita'
  return 'In corso'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(new Date(value))
}

function formatIsoDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}
