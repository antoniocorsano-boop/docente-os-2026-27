import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import AnnualPlanClient from './AnnualPlanClient'
import './annual-plan.css'

export const dynamic = 'force-dynamic'

export default async function AnnualPlanPage() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  return (
    <div className="appShell">
      <aside className="navRail" aria-label="Navigazione principale">
        <div className="brandLockup">
          <span className="brandMark">D</span>
          <div>
            <strong>DOCENTE OS</strong>
            <span>{context.academicYear?.label ?? 'Anno da configurare'}</span>
          </div>
        </div>
        <nav className="navList">
          <Link className="navItem" href="/"><span aria-hidden>⌂</span> Home</Link>
          <Link className="navItem" href="/planner"><span aria-hidden>◎</span> Oggi</Link>
          <Link className="navItem active" href="/piano-annuale"><span aria-hidden>▤</span> Piano annuale</Link>
          <Link className="navItem" href="/progetta"><span aria-hidden>✦</span> Progetta</Link>
          <Link className="navItem" href="/knowledge"><span aria-hidden>◇</span> Conoscenza</Link>
          <Link className="navItem" href="/classi"><span aria-hidden>▦</span> Classi</Link>
        </nav>
        <div className="navFooter">
          <span className="workspaceDot" aria-hidden />
          <div><strong>{context.workspace.name}</strong><span>{context.role}</span></div>
        </div>
      </aside>

      <main className="workSurface">
        <header className="mobileHeader">
          <div>
            <span className="mobileEyebrow">DOCENTE OS</span>
            <strong>{context.academicYear?.label ?? 'Anno scolastico'}</strong>
          </div>
          <form action="/auth/signout" method="post"><button className="iconButton" type="submit" aria-label="Esci">↗</button></form>
        </header>

        <AnnualPlanClient />
      </main>

      <nav className="bottomNav annualBottomNav" aria-label="Navigazione mobile">
        <Link href="/"><span aria-hidden>⌂</span><small>Home</small></Link>
        <Link href="/planner"><span aria-hidden>◎</span><small>Oggi</small></Link>
        <Link className="active" href="/piano-annuale"><span aria-hidden>▤</span><small>Piano</small></Link>
        <Link href="/progetta"><span aria-hidden>✦</span><small>Progetta</small></Link>
        <Link href="/classi"><span aria-hidden>▦</span><small>Classi</small></Link>
      </nav>
    </div>
  )
}
