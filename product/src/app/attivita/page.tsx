import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { PlannerTaskBoard } from './planner-task-board'
import './attivita.css'

export const dynamic = 'force-dynamic'

export default async function ActivitiesPage() {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')

  const tasks = await new SupabasePlannerRepository().listByWorkspace(context.workspace.id)
  const today = currentRomeDate()

  return (
    <AppShell
      active="activities"
      academicYearLabel={context.academicYear?.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="activitiesSurface"
    >
      <header className="activitiesHeader">
        <div>
          <p>ALTRO · LAVORO</p>
          <h1>Attività</h1>
          <span>Qui vivono le attività professionali generiche: priorità, scadenze, attese e cose da ripianificare. Non competono con il lavoro didattico immediato di Oggi.</span>
        </div>
      </header>
      <PlannerTaskBoard tasks={tasks} today={today} />
    </AppShell>
  )
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}
