import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export const dynamic = 'force-dynamic'

const entrances = [
  { href: '/planner', index: '01', title: 'Orario', description: 'Apri la giornata, organizza gli impegni e governa le prossime scadenze.', action: 'Vai alla giornata' },
  { href: '/knowledge?category=PROGRAMMING', index: '02', title: 'Progetta', description: 'Parti dalle fonti, dalla programmazione e dalle unità di conoscenza già contestualizzate.', action: 'Avvia la progettazione' },
  { href: '/classi', index: '03', title: 'Classi', description: 'Ritrova materiali e attività attraverso le classi e le sezioni del tuo anno scolastico.', action: 'Apri le classi' },
] as const

export default async function HomePage() {
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) redirect('/login')

  return (
    <div className="appShell">
      <aside className="navRail" aria-label="Navigazione principale">
        <div className="brandLockup"><span className="brandMark">D</span><div><strong>DOCENTE OS</strong><span>{context.academicYear?.label ?? 'Anno da configurare'}</span></div></div>
        <nav className="navList">
          <Link className="navItem active" href="/"><span aria-hidden>⌂</span> Home</Link>
          <Link className="navItem" href="/planner"><span aria-hidden>◎</span> Oggi</Link>
          <Link className="navItem" href="/knowledge"><span aria-hidden>◇</span> Conoscenza</Link>
          <Link className="navItem" href="/classi"><span aria-hidden>▦</span> Classi</Link>
        </nav>
        <div className="navFooter"><span className="workspaceDot" aria-hidden /><div><strong>{context.workspace.name}</strong><span>{context.role}</span></div></div>
      </aside>

      <main className="workSurface homeSurface">
        <header className="mobileHeader"><div><span className="mobileEyebrow">DOCENTE OS</span><strong>{context.academicYear?.label ?? 'Anno scolastico'}</strong></div><form action="/auth/signout" method="post"><button className="iconButton" type="submit" aria-label="Esci">↗</button></form></header>
        <section className="homeHero">
          <div><p>{context.workspace.name} · {context.academicYear?.label ?? 'Anno scolastico'}</p><h1>Il lavoro docente, organizzato intorno alle tue attività.</h1><span>Scegli da dove iniziare. Fonti, decisioni e documenti restano collegati e verificabili.</span></div>
          <form action="/auth/signout" method="post" className="desktopSignout"><button className="secondaryButton" type="submit">Esci</button></form>
        </section>
        <section className="homeEntrances" aria-labelledby="home-entrances-title">
          <div className="homeSectionHeading"><span>INGRESSI PRINCIPALI</span><h2 id="home-entrances-title">Cosa devi fare adesso?</h2></div>
          <div className="entranceGrid">{entrances.map((entrance) => <Link className="entranceCard" href={entrance.href} key={entrance.title}><span>{entrance.index}</span><h3>{entrance.title}</h3><p>{entrance.description}</p><strong>{entrance.action} <i aria-hidden>→</i></strong></Link>)}</div>
        </section>
        <section className="homeContinuity" aria-labelledby="continuity-title">
          <div className="homeSectionHeading"><span>CONTINUITÀ DEL LAVORO</span><h2 id="continuity-title">Dalla fonte all’azione</h2></div>
          <div className="continuityFlow"><span>Documenti e comunicazioni</span><i>→</i><span>Base di conoscenza</span><i>→</i><span>Planner e progettazione</span><i>→</i><span>Classi</span></div>
          <p>Ogni passaggio mantiene provenienza, generazione e validazione umana.</p>
        </section>
      </main>
      <nav className="bottomNav" aria-label="Navigazione mobile"><Link className="active" href="/"><span aria-hidden>⌂</span><small>Home</small></Link><Link href="/planner"><span aria-hidden>◎</span><small>Oggi</small></Link><Link href="/knowledge"><span aria-hidden>◇</span><small>KB</small></Link><Link href="/classi"><span aria-hidden>▦</span><small>Classi</small></Link></nav>
    </div>
  )
}
