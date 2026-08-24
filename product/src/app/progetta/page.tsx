import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { humanizeKnowledgeTitle, reliabilityLabel } from '@/core/presentation/product-language'
import { buildTaskAwareKnowledgeHref } from '@/core/presentation/task-continuity'
import {
  asProgettaFocus,
  asProgettaGrade,
  filterProgettaItemsByFocus,
  filterProgettaItemsByGrade,
  filterProgettaItemsBySectionContext,
  groupProgettaItems,
  partitionProgettaFocusBySection,
  planningCoverage,
  resolveCanonicalProgettaFocus,
  type ProgettaItem,
} from './progetta-model'
import './progetta.css'
import './progetta-coverage.css'
import './progetta-focus.css'

export const dynamic = 'force-dynamic'

const GRADE_NUMBER = { PRIMA: '1', SECONDA: '2', TERZA: '3' } as const
const GRADE_QUERY = { PRIMA: 'prima', SECONDA: 'seconda', TERZA: 'terza' } as const

type ProgettaSearchParams = {
  grade?: string
  section?: string
  block?: string
  uda?: string
  pack?: string
}

export default async function ProgettaPage({ searchParams }: { searchParams: Promise<ProgettaSearchParams> }) {
  const params = await searchParams
  const grade = asProgettaGrade(params.grade)
  const requestedFocus = asProgettaFocus({ block: params.block, uda: params.uda, pack: params.pack })
  const focus = resolveCanonicalProgettaFocus(grade, requestedFocus)
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const knowledgeRepository = new SupabaseKnowledgeRepository()
  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const [items, annualSnapshot] = await Promise.all([
    knowledgeRepository.listRecent(context.workspace.id, 100),
    params.section && context.academicYear
      ? annualRepository.list(context.workspace.id, context.academicYear.id)
      : Promise.resolve(null),
  ])

  const requestedSection = params.section && annualSnapshot
    ? annualSnapshot.sections.find((section) => section.id === params.section) ?? null
    : null
  const sectionContext = requestedSection && (!grade || GRADE_QUERY[requestedSection.grade] === grade)
    ? requestedSection
    : null
  const compactSectionLabel = sectionContext ? `${GRADE_NUMBER[sectionContext.grade]}${sectionContext.sectionCode}` : null
  const displaySectionLabel = sectionContext ? `${GRADE_NUMBER[sectionContext.grade]}ª ${sectionContext.sectionCode}` : null

  const gradeItems = filterProgettaItemsByGrade(items, grade)
  const scopedItems = filterProgettaItemsBySectionContext(gradeItems, compactSectionLabel)
  const gradeLabel = grade ? `Classe ${grade}` : null
  const planningReturnParams = new URLSearchParams()
  if (grade) planningReturnParams.set('grade', grade)
  if (sectionContext) planningReturnParams.set('section', sectionContext.id)
  const planningReturnQuery = planningReturnParams.toString()
  const planningReturnHref = planningReturnQuery ? `/progetta?${planningReturnQuery}` : '/progetta'

  if (focus) {
    const focusedItems = filterProgettaItemsByFocus(scopedItems, focus)
    const focused = partitionProgettaFocusBySection(focusedItems, compactSectionLabel)
    const coreItems = prioritizeGuidedItems(focused.core).slice(0, 4)
    const sectionItems = prioritizeGuidedItems(focused.section).slice(0, 3)
    const fullPlanningHref = grade ? `/progetta?grade=${grade}` : '/progetta'
    const annualPlanHref = sectionContext ? `/piano-annuale?section=${encodeURIComponent(sectionContext.id)}` : '/piano-annuale'
    const currentFocusParams = new URLSearchParams()
    if (grade) currentFocusParams.set('grade', grade)
    if (sectionContext) currentFocusParams.set('section', sectionContext.id)
    currentFocusParams.set('block', focus.blockId)
    currentFocusParams.set('uda', focus.uda)
    currentFocusParams.set('pack', focus.pack)
    const currentFocusHref = `/progetta?${currentFocusParams.toString()}#focus-operativo`

    return (
      <AppShell active="design" academicYearLabel={context.academicYear?.label} workspaceName={context.workspace.name} role={context.role} contentClassName="progettaSurface progettaGuidedSurface">
        <section className="guidedPlanningHeader">
          <div className="guidedPlanningPath">
            <span>{displaySectionLabel ?? gradeLabel ?? 'Progetta'}</span>
            <i aria-hidden>›</i>
            <span>{focus.blockId}</span>
          </div>
          <p>PROSSIMA FASE</p>
          <h1>{focus.title}</h1>
          <div className="guidedPlanningMeta">
            <span>UDA {focus.uda}</span>
            <span>{focus.pack}</span>
            <span>{focus.period}</span>
          </div>
          <p className="guidedPlanningInstruction">Parti dal nucleo comune del grado. Adatta alla sezione solo quando serve davvero: non è necessario creare una copia dell’UDA.</p>
        </section>

        <section className="guidedNow" aria-labelledby="guided-now-title">
          <header>
            <div><span>ADESSO</span><h2 id="guided-now-title">Apri ciò che ti serve</h2></div>
            <small>{coreItems.length} {coreItems.length === 1 ? 'risorsa pertinente' : 'risorse pertinenti'}</small>
          </header>
          {coreItems.length ? (
            <div className="guidedResourceList">
              {coreItems.map((item, index) => (
                <GuidedResourceLink
                  item={item}
                  order={index + 1}
                  key={item.asset.id}
                  href={buildTaskAwareKnowledgeHref(item.asset.id, {
                    mode: 'prepare',
                    returnTo: currentFocusHref,
                    sectionId: sectionContext?.id,
                    blockId: focus.blockId,
                  })}
                />
              ))}
            </div>
          ) : (
            <div className="guidedEmpty">
              <strong>Nessun contenuto è ancora collegato esplicitamente a questa fase.</strong>
              <p>Il piano annuale resta valido; puoi cercare o acquisire il materiale senza perdere il contesto della classe.</p>
              <Link href="/knowledge">Apri Conoscenza</Link>
            </div>
          )}
        </section>

        {sectionContext ? (
          <section className="guidedSectionAdaptation" aria-label={`Adattamento ${displaySectionLabel}`}>
            <header><div><span>SOLO SE SERVE</span><h2>Adattamento {displaySectionLabel}</h2></div></header>
            {sectionItems.length ? (
              <div className="guidedAdaptationItems">
                {sectionItems.map((item) => (
                  <GuidedResourceLink
                    item={item}
                    compact
                    key={item.asset.id}
                    href={buildTaskAwareKnowledgeHref(item.asset.id, {
                      mode: 'prepare',
                      returnTo: currentFocusHref,
                      sectionId: sectionContext.id,
                      blockId: focus.blockId,
                    })}
                  />
                ))}
              </div>
            ) : (
              <p>Nessun adattamento specifico registrato. Per questa fase puoi usare direttamente il nucleo comune.</p>
            )}
          </section>
        ) : null}

        <nav className="guidedPlanningActions" aria-label="Altri percorsi disponibili">
          {sectionContext ? <Link className="primary" href={`/classi/${encodeURIComponent(sectionContext.id)}`}>Torna alla classe</Link> : null}
          <Link href={annualPlanHref}>Piano annuale</Link>
          <Link href={fullPlanningHref}>Esplora tutta la progettazione</Link>
        </nav>
      </AppShell>
    )
  }

  const groups = groupProgettaItems(scopedItems)
  const coverage = planningCoverage(items)
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)

  return (
    <AppShell active="design" academicYearLabel={context.academicYear?.label} workspaceName={context.workspace.name} role={context.role} contentClassName="progettaSurface">
      <section className="plannerHeader progettaHeader">
        <div><p className="contextLine">{context.workspace.name} · {context.academicYear?.label ?? 'Anno scolastico'}</p><h1>Progetta</h1><p className="dayLine">{gradeLabel ? `Stai lavorando sul nucleo didattico della ${gradeLabel.toLowerCase()}.` : 'Parti dalle fonti già raccolte e trasformale in programmazione, UDA e materiali da usare in classe.'}</p></div>
        <div className="progettaHeaderActions">
          {sectionContext ? <Link className="secondaryButton" href={`/classi/${encodeURIComponent(sectionContext.id)}`}>Apri classe</Link> : null}
          {grade ? <Link className="secondaryButton" href="/progetta">Tutte le classi</Link> : null}
          <Link className="secondaryButton" href="/knowledge">Apri Conoscenza</Link>
        </div>
      </section>

      {grade ? <section className="progettaContextBanner"><div className="progettaContextIdentity"><span>NUCLEO COMUNE</span><strong>{gradeLabel}</strong></div><p>Il nucleo didattico appartiene al grado. {displaySectionLabel ? `La ${displaySectionLabel} è il contesto corrente per eventuali adattamenti, che restano separati e non duplicano l’UDA comune.` : 'Gli adattamenti per una singola sezione restano separati dal nucleo condiviso.'}</p></section> : null}

      <section className="progettaWorkflow" aria-label="Percorso di progettazione">
        <div><span>01</span><strong>Fonti</strong><small>Documenti e riferimenti originali</small></div><i>→</i><div><span>02</span><strong>Quadro annuale</strong><small>Obiettivi, tempi e copertura</small></div><i>→</i><div><span>03</span><strong>UDA</strong><small>Percorsi ed evidenze</small></div><i>→</i><div><span>04</span><strong>Materiali</strong><small>Attività, rubriche e verifiche</small></div>
      </section>

      <div className="progettaSummary"><div><span>CONTENUTI DISPONIBILI</span><strong>{total}</strong></div><p>{gradeLabel ? `Contenuti pertinenti alla ${gradeLabel.toLowerCase()}${displaySectionLabel ? `, esclusi gli adattamenti appartenenti ad altre sezioni` : ''}.` : 'Qui trovi i contenuti già raccolti e collegati alla progettazione.'} DOCENTE OS usa la versione di lavoro corrente senza modificare le fonti originali.</p></div>

      {!grade ? <section className="planningCoverage" aria-label="Copertura della progettazione per classe">
        {coverage.map((item) => <div key={item.grade}><span>CLASSE {item.grade.toUpperCase()}</span><strong>{item.programming ? 'Programmazione disponibile' : 'Programmazione da aggiungere'}</strong><small className={item.uda ? 'covered' : ''}>{item.uda} {item.uda === 1 ? 'UDA collegata' : 'UDA collegate'}</small><small className={item.materials ? 'covered' : ''}>{item.materials} {item.materials === 1 ? 'pacchetto operativo' : 'pacchetti operativi'}</small></div>)}
      </section> : null}

      <section className="progettaGroups" aria-label="Aree di progettazione">
        {groups.map((group, index) => <article className="progettaGroup" key={group.key}>
          <header><span>0{index + 1}</span><div><h2>{group.title}</h2><p>{group.description}</p></div><b>{group.items.length}</b></header>
          {group.items.length ? <div className="progettaItems">{group.items.map((item) => <ProgettaItemLink item={item} returnTo={planningReturnHref} key={item.asset.id} />)}</div> : <div className="progettaEmpty"><p>Non ci sono ancora contenuti collegati a questa area{gradeLabel ? ` per la ${gradeLabel.toLowerCase()}` : ''}.</p><Link href={`/knowledge?category=${categoryFor(group.key)}`}>Apri Conoscenza <span aria-hidden>→</span></Link></div>}
        </article>)}
      </section>

      <aside className="governanceNote"><strong>Come lavoriamo</strong><p>Il nucleo comune viene prima degli adattamenti per le singole sezioni. Le ore previste restano distinte da quelle effettivamente svolte e le modifiche significative richiedono sempre la tua verifica.</p></aside>
    </AppShell>
  )
}

function GuidedResourceLink({ item, order, compact = false, href }: { item: ProgettaItem; order?: number; compact?: boolean; href?: string }) {
  const { asset, document } = item
  return (
    <Link className={compact ? 'guidedResource compact' : 'guidedResource'} href={href ?? `/knowledge/${asset.id}`}>
      {order ? <span className="guidedResourceOrder">{String(order).padStart(2, '0')}</span> : null}
      <div className="guidedResourceCopy">
        <small>{guidedCategoryLabel(asset.contentCategory)}</small>
        <strong>{humanizeKnowledgeTitle(document?.title ?? asset.originalName)}</strong>
        <p>{document?.summary ?? guidedFallback(asset.contentCategory)}</p>
      </div>
      <b>{guidedActionLabel(asset.contentCategory)} <span aria-hidden>→</span></b>
    </Link>
  )
}

function ProgettaItemLink({ item, returnTo }: { item: ProgettaItem; returnTo: string }) {
  const { asset, document } = item
  const sourceHref = buildTaskAwareKnowledgeHref(asset.id, { mode: 'prepare', returnTo })
  return (
    <div className="progettaItemRow">
      <Link className="progettaItemSource" href={sourceHref}>
        <div><strong>{humanizeKnowledgeTitle(document?.title ?? asset.originalName)}</strong><span>{document?.summary ?? 'Apri il contenuto per controllare il contesto e decidere come usarlo.'}</span></div>
        <aside>{(asset.classLabels ?? []).length ? asset.classLabels.map((label) => <small key={label}>{label}</small>) : <small>{sourceGradeLabel(asset.sourceMetadata.grade)}</small>}<em>{reliabilityLabel(asset.reliability)}</em></aside>
      </Link>
      {asset.contentCategory === 'UDA' ? <Link className="progettaAuthoringAction" href={`/progetta/documenti/nuovo/${encodeURIComponent(asset.id)}`}>Prepara documento <span aria-hidden>→</span></Link> : null}
    </div>
  )
}

function prioritizeGuidedItems(items: ProgettaItem[]) {
  const rank: Record<string, number> = { UDA: 0, TEACHING_RESOURCE: 1, ASSESSMENT: 2, MODEL: 3, PROGRAMMING: 4 }
  return [...items].sort((a, b) => (rank[a.asset.contentCategory] ?? 9) - (rank[b.asset.contentCategory] ?? 9) || b.asset.capturedAt.localeCompare(a.asset.capturedAt))
}

function guidedCategoryLabel(category: string) {
  if (category === 'UDA') return 'Unità di apprendimento'
  if (category === 'ASSESSMENT') return 'Valutazione'
  if (category === 'MODEL') return 'Modello'
  if (category === 'PROGRAMMING') return 'Quadro annuale'
  return 'Materiale operativo'
}

function guidedActionLabel(category: string) {
  if (category === 'UDA') return 'Apri UDA'
  if (category === 'ASSESSMENT') return 'Apri valutazione'
  if (category === 'PROGRAMMING') return 'Apri quadro'
  return 'Apri materiale'
}

function guidedFallback(category: string) {
  if (category === 'UDA') return 'Controlla obiettivi, attività, evidenze e criteri prima di preparare la lezione.'
  if (category === 'ASSESSMENT') return 'Controlla lo strumento di osservazione o valutazione collegato alla fase.'
  return 'Apri la risorsa operativa collegata a questa fase del piano.'
}

function categoryFor(key: string) {
  if (key === 'programming') return 'PROGRAMMING'
  if (key === 'uda') return 'UDA'
  return 'TEACHING_RESOURCE'
}

function sourceGradeLabel(value: unknown) {
  if (value === 'prima') return 'Classe prima'
  if (value === 'seconda') return 'Classe seconda'
  if (value === 'terza') return 'Classe terza'
  return 'Comune'
}