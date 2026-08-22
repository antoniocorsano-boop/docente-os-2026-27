import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export const dynamic = 'force-dynamic'

const entrances = [
  { href: '/planner', index: '01', title: 'Oggi', description: 'Apri la giornata, organizza gli impegni e governa le prossime scadenze.', action: 'Vai alla giornata' },
  { href: '/orario', index: '02', title: 'Orario', description: 'Configura cattedra, versione e slot settimanali a partire dalle tue Impostazioni.', action: 'Configura l’orario' },
  { href: '/piano-annuale', index: '03', title: 'Piano annuale', description: 'Segui i 33 blocchi e le 66 ore per classe, con UDA, pacchetti, sezioni ed evidenze.', action: 'Apri il piano annuale' },
  { href: '/progetta', index: '04', title: 'Progetta', description: 'Parti dalle fonti, dalla programmazione e dalle unità di conoscenza già contestualizzate.', action: 'Avvia la progettazione' },
  { href: '/classi', index: '05', title: 'Classi', description: 'Ritrova materiali e attività attraverso le classi e le sezioni del tuo anno scolastico.', action: 'Apri le classi' },
] as const

export default async function HomePage() {
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) redirect('/login')

  const teacherSettings = context.academicYear
    ? await new SupabaseTeacherSettingsRepository().getOrCreate(context.workspace.id, context.academicYear.id)
    : null
  const professionalContext = [
    teacherSettings?.teacherDisplayName || null,
    teacherSettings?.schoolName || context.workspace.name,
    context.academicYear?.label ?? null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="appShell">
      <aside className="navRail" aria-label="Navigazione principale">
        <div className="brandLockup"><span className="brandMark">D</span><div><strong>DOCENTE OS</strong><span>{context.academicYear?.label ?? 'Anno da configurare'}</span></div></div>
        <nav className="navList">
          <Link className="navItem active" href="/"><span aria-hidden>⌂</span> Home</Link>
          <Link className="navItem" href="/planner"><span aria-hidden>◎</span> Oggi</Link>
          <Link className="navItem" href="/orario"><span aria-hidden>◷</span> Orario</Link>
          <Link className="navItem" href="/piano-annuale"><span aria-hidden>▤</span> Piano annuale</Link>
          <Link className="navItem" href="/progetta"><span aria-hidden>✦</span> Progetta</Link>
          <Link className="navItem" href="/knowledge"><span aria-hidden>◇</span> Conoscenza</Link>
          <Link className="navItem" href="/classi"><span aria-hidden>▦</span> Classi</Link>
          <Link className="navItem" href="/impostazioni"><span aria-hidden>⚙</span> Impostazioni</Link>
        </nav>
        <div className="navFooter"><span className="workspaceDot" aria-hidden /><div><strong>{teacherSettings?.schoolName || context.workspace.name}</strong><span>{teacherSettings?.teacherDisplayName || context.role}</span></div></div>
      </aside>

      <main className="workSurface homeSurface">
        <header className="mobileHeader"><div><span className="mobileEyebrow">DOCENTE OS</span><strong>{context.academicYear?.label ?? 'Anno scolastico'}</strong></div><form action="/auth/signout" method="post"><button className="iconButton" type="submit" aria-label="Esci">↗</button></form></header>
        <section className="homeHero">
          <div><p>{professionalContext}</p><h1>Il lavoro docente, organizzato intorno alle tue attività.</h1><span>Scegli da dove iniziare. Fonti, decisioni e documenti restano collegati e verificabili.</span></div>
          <form action="/auth/signout" method="post" className="desktopSignout"><button className="secondaryButton" type="submit">Esci</button></form>
        </section>
        <section className="homeEntrances" aria-labelledby="home-entrances-title">
          <div className="homeSectionHeading"><span>INGRESSI PRINCIPALI</span><h2 id="home-entrances-title">Cosa devi fare adesso?</h2></div>
          <div className="entranceGrid">{entrances.map((entrance) => <Link className="entranceCard" href={entrance.href} key={entrance.title}><span>{entrance.index}</span><h3>{entrance.title}</h3><p>{entrance.description}</p><strong>{entrance.action} <i aria-hidden>→</i></strong></Link>)}</div>
        </section>
        <section className="homeContinuity" aria-labelledby="continuity-title">
          <div className="homeSectionHeading"><span>CONTINUITÀ DEL LAVORO</span><h2 id="continuity-title">Dalla fonte all’azione</h2></div>
          <div className="continuityFlow"><span>Documenti e comunicazioni</span><i>→</i><span>Base di conoscenza</span><i>→</i><span>Piano annuale e progettazione</span><i>→</i><span>Orario e classi</span></div>
          <p>Ogni passaggio mantiene provenienza, generazione e validazione umana.</p>
        </section>
      </main>
      <nav className="bottomNav" aria-label="Navigazione mobile"><Link className="active" href="/"><span aria-hidden>⌂</span><small>Home</small></Link><Link href="/planner"><span aria-hidden>◎</span><small>Oggi</small></Link><Link href="/orario"><span aria-hidden>◷</span><small>Orario</small></Link><Link href="/progetta"><span aria-hidden>✦</span><small>Progetta</small></Link><Link href="/classi"><span aria-hidden>▦</span><small>Classi</small></Link><Link href="/impostazioni"><span aria-hidden>⚙</span><small>Impost.</small></Link></nav>
    </div>
  )
}
