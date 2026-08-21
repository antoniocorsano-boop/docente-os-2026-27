import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { classCounts } from './class-counts'

export const dynamic = 'force-dynamic'

export default async function ClassesPage() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  const knowledgeRepository = new SupabaseKnowledgeRepository()
  const assets = await knowledgeRepository.listRecent(context.workspace.id, 100)
  const classes = classCounts(assets.flatMap(({ asset }) => asset.classLabels))

  return (
    <div className="appShell">
      <aside className="navRail" aria-label="Navigazione principale">
        <div className="brandLockup"><span className="brandMark">D</span><div><strong>DOCENTE OS</strong><span>{context.academicYear?.label ?? 'Anno da configurare'}</span></div></div>
        <nav className="navList"><Link className="navItem" href="/"><span aria-hidden>⌂</span> Home</Link><Link className="navItem" href="/planner"><span aria-hidden>◎</span> Oggi</Link><Link className="navItem" href="/progetta"><span aria-hidden>✦</span> Progetta</Link><Link className="navItem" href="/knowledge"><span aria-hidden>◇</span> Conoscenza</Link><Link className="navItem active" href="/classi"><span aria-hidden>▦</span> Classi</Link></nav>
        <div className="navFooter"><span className="workspaceDot" aria-hidden /><div><strong>{context.workspace.name}</strong><span>{context.role}</span></div></div>
      </aside>
      <main className="workSurface classesSurface">
        <header className="mobileHeader"><div><span className="mobileEyebrow">DOCENTE OS</span><strong>Classi</strong></div><Link className="iconButton knowledgeBack" href="/" aria-label="Torna alla Home">←</Link></header>
        <section className="plannerHeader"><div><p className="contextLine">{context.workspace.name} · {context.academicYear?.label ?? 'Anno scolastico'}</p><h1>Classi</h1><p className="dayLine">Materiali e fonti organizzati attraverso classi e sezioni.</p></div></section>
        {classes.length ? <div className="classesGrid">{classes.map(([label, count]) => <Link className="classCard" href={`/knowledge?classLabel=${encodeURIComponent(label)}`} key={label}><span>CLASSE</span><h2>{label}</h2><p>{count} {count === 1 ? 'asset collegato' : 'asset collegati'}</p><strong>Apri materiali <i aria-hidden>→</i></strong></Link>)}</div> : <section className="emptyClasses"><span>NESSUNA CLASSE ASSOCIATA</span><h2>Costruisci la vista Classi dalla tua conoscenza.</h2><p>Quando classifichi un asset indicando classe e sezione, la classe compare automaticamente qui.</p><Link href="/knowledge">Classifica gli asset nella KB</Link></section>}
      </main>
      <nav className="bottomNav" aria-label="Navigazione mobile"><Link href="/"><span aria-hidden>⌂</span><small>Home</small></Link><Link href="/planner"><span aria-hidden>◎</span><small>Oggi</small></Link><Link href="/progetta"><span aria-hidden>✦</span><small>Progetta</small></Link><Link className="active" href="/classi"><span aria-hidden>▦</span><small>Classi</small></Link></nav>
    </div>
  )
}
