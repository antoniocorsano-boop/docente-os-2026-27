import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SECONDARY_NAVIGATION_GROUPS, navigationGroupItems } from '@/components/app-shell/navigation'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import './altro.css'

export const dynamic = 'force-dynamic'

export default async function MorePage() {
  const context = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!context) redirect('/login')

  return (
    <AppShell
      active="more"
      academicYearLabel={context.academicYear?.label}
      workspaceName={context.workspace.name}
      role={context.role}
      contentClassName="moreSurface"
    >
      <header className="moreHeader">
        <p>ALTRO</p>
        <h1>Strumenti professionali</h1>
        <span>Qui trovi ciò che non serve sempre. I gruppi orientano la lettura senza aggiungere altri livelli di navigazione.</span>
      </header>
      <div className="moreGroups">
        {SECONDARY_NAVIGATION_GROUPS.map((group) => (
          <section className="moreGroup" key={group.key} aria-labelledby={`more-${group.key}`}>
            <h2 id={`more-${group.key}`}>{group.label}</h2>
            <div className="moreLinks">
              {navigationGroupItems(group).map((item) => (
                <Link href={item.href} key={item.key}>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  )
}
