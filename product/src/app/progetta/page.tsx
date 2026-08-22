import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { humanizeKnowledgeTitle, reliabilityLabel } from '@/core/presentation/product-language'
import { groupProgettaItems, planningCoverage } from './progetta-model'
import './progetta.css'
import './progetta-coverage.css'

export const dynamic = 'force-dynamic'

export default async function ProgettaPage() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const knowledgeRepository = new SupabaseKnowledgeRepository()
  const items = await knowledgeRepository.listRecent(context.workspace.id, 100)
  const groups = groupProgettaItems(items)
  const coverage = planningCoverage(items)
  const total = groups.reduce((sum, group) => sum + group.items.length, 0)

  return (
    <div className="appShell">
      <aside className="navRail" aria-label="Navigazione principale">
        <div className="brandLockup"><span className="brandMark">D</span><div><strong>DOCENTE OS</strong><span>{context.academicYear?.label ?? 'Anno da configurare'}</span></div></div>
        <nav className="navList"><Link className="navItem" href="/"><span aria-hidden>⌂</span> Home</Link><Link className="navItem" href="/planner"><span aria-hidden>◎</span> Oggi</Link><Link className="navItem active" href="/progetta"><span aria-hidden>✦</span> Progetta</Link><Link className="navItem" href="/knowledge"><span aria-hidden>◇</span> Conoscenza</Link><Link className="navItem" href="/classi"><span aria-hidden>▦</span> Classi</Link></nav>
        <div className="navFooter"><span className="workspaceDot" aria-hidden /><div><strong>{context.workspace.name}</strong><span>{context.role}</span></div></div>
      </aside>

      <main className="workSurface progettaSurface">
        <header className="mobileHeader"><div><span className="mobileEyebrow">DOCENTE OS</span><strong>Progetta</strong></div><Link className="iconButton" href="/knowledge" aria-label="Apri Conoscenza">◇</Link></header>
        <section className="plannerHeader progettaHeader">
          <div><p className="contextLine">{context.workspace.name} · {context.academicYear?.label ?? 'Anno scolastico'}</p><h1>Progetta</h1><p className="dayLine">Parti dalle fonti già raccolte e trasformale in programmazione, UDA e materiali da usare in classe.</p></div>
          <Link className="secondaryButton" href="/knowledge">Apri Conoscenza</Link>
        </section>

        <section className="progettaWorkflow" aria-label="Percorso di progettazione">
          <div><span>01</span><strong>Fonti</strong><small>Documenti e riferimenti originali</small></div><i>→</i><div><span>02</span><strong>Quadro annuale</strong><small>Obiettivi, tempi e copertura</small></div><i>→</i><div><span>03</span><strong>UDA</strong><small>Percorsi ed evidenze</small></div><i>→</i><div><span>04</span><strong>Materiali</strong><small>Attività, rubriche e verifiche</small></div>
        </section>

        <div className="progettaSummary"><div><span>CONTENUTI DISPONIBILI</span><strong>{total}</strong></div><p>Qui trovi i contenuti già raccolti e collegati alla progettazione. DOCENTE OS usa la versione di lavoro corrente senza modificare le fonti originali.</p></div>

        <section className="planningCoverage" aria-label="Copertura della progettazione per classe">
          {coverage.map((item) => <div key={item.grade}><span>CLASSE {item.grade.toUpperCase()}</span><strong>{item.programming ? 'Programmazione disponibile' : 'Programmazione da aggiungere'}</strong><small className={item.uda ? 'covered' : ''}>{item.uda} {item.uda === 1 ? 'UDA collegata' : 'UDA collegate'}</small><small className={item.materials ? 'covered' : ''}>{item.materials} {item.materials === 1 ? 'pacchetto operativo' : 'pacchetti operativi'}</small></div>)}
        </section>

        <section className="progettaGroups" aria-label="Aree di progettazione">
          {groups.map((group, index) => <article className="progettaGroup" key={group.key}>
            <header><span>0{index + 1}</span><div><h2>{group.title}</h2><p>{group.description}</p></div><b>{group.items.length}</b></header>
            {group.items.length ? <div className="progettaItems">{group.items.map(({ asset, document }) => <Link href={`/knowledge/${asset.id}`} key={asset.id}>
              <div><strong>{humanizeKnowledgeTitle(document?.title ?? asset.originalName)}</strong><span>{document?.summary ?? 'Apri il contenuto per controllare il contesto e decidere come usarlo.'}</span></div>
              <aside>{asset.classLabels.length ? asset.classLabels.map((label) => <small key={label}>{label}</small>) : <small>{gradeLabel(asset.sourceMetadata.grade)}</small>}<em>{reliabilityLabel(asset.reliability)}</em></aside>
            </Link>)}</div> : <div className="progettaEmpty"><p>Non ci sono ancora contenuti collegati a questa area.</p><Link href={`/knowledge?category=${categoryFor(group.key)}`}>Apri Conoscenza <span aria-hidden>→</span></Link></div>}
          </article>)}
        </section>

        <aside className="governanceNote"><strong>Come lavoriamo</strong><p>Il nucleo comune viene prima degli adattamenti per le singole sezioni. Le ore previste restano distinte da quelle effettivamente svolte e le modifiche significative richiedono sempre la tua verifica.</p></aside>
      </main>
      <nav className="bottomNav" aria-label="Navigazione mobile"><Link href="/"><span aria-hidden>⌂</span><small>Home</small></Link><Link href="/planner"><span aria-hidden>◎</span><small>Oggi</small></Link><Link className="active" href="/progetta"><span aria-hidden>✦</span><small>Progetta</small></Link><Link href="/classi"><span aria-hidden>▦</span><small>Classi</small></Link></nav>
    </div>
  )
}

function categoryFor(key: string) {
  if (key === 'programming') return 'PROGRAMMING'
  if (key === 'uda') return 'UDA'
  return 'TEACHING_RESOURCE'
}

function gradeLabel(value: unknown) {
  if (value === 'prima') return 'Classe prima'
  if (value === 'seconda') return 'Classe seconda'
  if (value === 'terza') return 'Classe terza'
  return 'Comune'
}
