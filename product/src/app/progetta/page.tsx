import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { humanizeKnowledgeTitle, reliabilityLabel } from '@/core/presentation/product-language'
import {
  asProgettaFocus,
  asProgettaGrade,
  filterProgettaItemsByFocus,
  filterProgettaItemsByGrade,
  filterProgettaItemsBySectionContext,
  groupProgettaItems,
  partitionProgettaFocusBySection,
  planningCoverage,
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
  const focus = asProgettaFocus({ block: params.block, uda: params.uda, pack: params.pack })
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
  const focusedItems = filterProgettaItemsByFocus(scopedItems, focus)
  const focused = partitionProgettaFocusBySection(focusedItems, compactSectionLabel)
  const focusedIds = new Set(focusedItems.map(({ asset }) => asset.id))
  const remainingItems = focus ? scopedItems.filter(({ asset }) => !focusedIds.has(asset.id)) : scopedItems
  const groups = groupProgettaItems(remainingItems)
  const coverage = planningCoverage(items)
  const total = groupProgettaItems(scopedItems).reduce((sum, group) => sum + group.items.length, 0)
  const gradeLabel = grade ? `Classe ${grade}` : null

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

      {grade ? <section className="progettaContextBanner"><span>NUCLEO COMUNE</span><strong>{gradeLabel}</strong><p>Il nucleo didattico appartiene al grado. {displaySectionLabel ? `La ${displaySectionLabel} è il contesto corrente per eventuali adattamenti, che restano separati e non duplicano l’UDA comune.` : 'Gli adattamenti per una singola sezione restano separati dal nucleo condiviso.'}</p></section> : null}

      {focus ? (
        <section className="progettaFocus" id="focus-operativo" aria-labelledby="focus-operativo-title">
          <header>
            <div><span>FASE DA PREPARARE</span><h2 id="focus-operativo-title">{focus.uda ? `UDA ${focus.uda}` : 'Focus di progettazione'}</h2><p>{[focus.blockId, focus.pack].filter(Boolean).join(' · ')}</p></div>
            {displaySectionLabel ? <strong>Contesto: {displaySectionLabel}</strong> : null}
          </header>
          <div className="progettaFocusColumns">
            <FocusColumn title="Nucleo comune del grado" description="UDA, pacchetto e materiali condivisi da cui partire." items={focused.core} empty="Nessun contenuto è ancora collegato esplicitamente a questo UDA/pacchetto nel nucleo comune." />
            {sectionContext ? <FocusColumn title={`Adattamento ${displaySectionLabel}`} description="Solo materiali collegati esplicitamente a questa sezione." items={focused.section} empty="Nessun adattamento specifico registrato: puoi lavorare direttamente sul nucleo comune senza crearne una copia." /> : null}
          </div>
        </section>
      ) : null}

      <section className="progettaWorkflow" aria-label="Percorso di progettazione">
        <div><span>01</span><strong>Fonti</strong><small>Documenti e riferimenti originali</small></div><i>→</i><div><span>02</span><strong>Quadro annuale</strong><small>Obiettivi, tempi e copertura</small></div><i>→</i><div><span>03</span><strong>UDA</strong><small>Percorsi ed evidenze</small></div><i>→</i><div><span>04</span><strong>Materiali</strong><small>Attività, rubriche e verifiche</small></div>
      </section>

      <div className="progettaSummary"><div><span>CONTENUTI DISPONIBILI</span><strong>{total}</strong></div><p>{gradeLabel ? `Contenuti pertinenti alla ${gradeLabel.toLowerCase()}${displaySectionLabel ? `, esclusi gli adattamenti appartenenti ad altre sezioni` : ''}.` : 'Qui trovi i contenuti già raccolti e collegati alla progettazione.'} DOCENTE OS usa la versione di lavoro corrente senza modificare le fonti originali.</p></div>

      {!grade ? <section className="planningCoverage" aria-label="Copertura della progettazione per classe">
        {coverage.map((item) => <div key={item.grade}><span>CLASSE {item.grade.toUpperCase()}</span><strong>{item.programming ? 'Programmazione disponibile' : 'Programmazione da aggiungere'}</strong><small className={item.uda ? 'covered' : ''}>{item.uda} {item.uda === 1 ? 'UDA collegata' : 'UDA collegate'}</small><small className={item.materials ? 'covered' : ''}>{item.materials} {item.materials === 1 ? 'pacchetto operativo' : 'pacchetti operativi'}</small></div>)}
      </section> : null}

      <section className="progettaGroups" aria-label={focus ? 'Altri contenuti della progettazione' : 'Aree di progettazione'}>
        {groups.map((group, index) => <article className="progettaGroup" key={group.key}>
          <header><span>0{index + 1}</span><div><h2>{focus ? `Altri · ${group.title}` : group.title}</h2><p>{group.description}</p></div><b>{group.items.length}</b></header>
          {group.items.length ? <div className="progettaItems">{group.items.map((item) => <ProgettaItemLink item={item} key={item.asset.id} />)}</div> : <div className="progettaEmpty"><p>Non ci sono altri contenuti collegati a questa area{gradeLabel ? ` per la ${gradeLabel.toLowerCase()}` : ''}.</p><Link href={`/knowledge?category=${categoryFor(group.key)}`}>Apri Conoscenza <span aria-hidden>→</span></Link></div>}
        </article>)}
      </section>

      <aside className="governanceNote"><strong>Come lavoriamo</strong><p>Il nucleo comune viene prima degli adattamenti per le singole sezioni. Le ore previste restano distinte da quelle effettivamente svolte e le modifiche significative richiedono sempre la tua verifica.</p></aside>
    </AppShell>
  )
}

function FocusColumn({ title, description, items, empty }: { title: string; description: string; items: ProgettaItem[]; empty: string }) {
  return (
    <article className="progettaFocusColumn">
      <div><h3>{title}</h3><p>{description}</p></div>
      {items.length ? <div className="progettaFocusItems">{items.map((item) => <ProgettaItemLink item={item} key={item.asset.id} />)}</div> : <p className="progettaFocusEmpty">{empty}</p>}
    </article>
  )
}

function ProgettaItemLink({ item }: { item: ProgettaItem }) {
  const { asset, document } = item
  return (
    <Link href={`/knowledge/${asset.id}`}>
      <div><strong>{humanizeKnowledgeTitle(document?.title ?? asset.originalName)}</strong><span>{document?.summary ?? 'Apri il contenuto per controllare il contesto e decidere come usarlo.'}</span></div>
      <aside>{(asset.classLabels ?? []).length ? asset.classLabels.map((label) => <small key={label}>{label}</small>) : <small>{sourceGradeLabel(asset.sourceMetadata.grade)}</small>}<em>{reliabilityLabel(asset.reliability)}</em></aside>
    </Link>
  )
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
