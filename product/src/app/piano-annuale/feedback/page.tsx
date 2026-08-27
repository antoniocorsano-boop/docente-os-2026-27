import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import FeedbackPageClient from './FeedbackPageClient'
import '../annual-plan.css'
import '../annual-plan-mobile-comfort.css'

export const dynamic = 'force-dynamic'

export default async function CurriculumFeedbackPage() {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/workspace')

  const snapshot = await new SupabaseAnnualPlanExecutionRepository().list(context.workspace.id, context.academicYear.id)

  return (
    <AppShell
      active="annual-plan"
      academicYearLabel={context.academicYear.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="annualPlanSurface"
    >
      <section className="annualHero annualHeroClarified">
        <div>
          <p className="contextLine">PIANO ANNUALE · RIFLESSIONE PROFESSIONALE</p>
          <h1>Condividi un’osservazione sul curricolo</h1>
          <p>Trasforma un’esperienza professionale in un’osservazione riferita al quadro curricolare già accettato. Il file resta sul tuo dispositivo finché non scegli tu di portarlo in CurManLight Arena.</p>
        </div>
      </section>
      <Link className="secondaryButton" href="/piano-annuale">Torna al Piano annuale</Link>
      <FeedbackPageClient sections={snapshot.sections.map((section) => ({ id: section.id, grade: section.grade, sectionCode: section.sectionCode }))} />
    </AppShell>
  )
}
