import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import styles from '../prossima/lesson-materials.module.css'
import { TomorrowMaterialsContent } from './tomorrow-materials-content'
import { loadTomorrowPreparationBundle } from './tomorrow-preparation-loader'

export const dynamic = 'force-dynamic'

export default async function TomorrowMaterialsPage() {
  const workspaceContext = await new SupabaseWorkspaceRepository().getCurrentContext()
  if (!workspaceContext) redirect('/login')
  if (!workspaceContext.academicYear) redirect('/workspace')

  const tomorrow = await loadTomorrowPreparationBundle({
    workspaceId: workspaceContext.workspace.id,
    academicYearId: workspaceContext.academicYear.id,
  })

  return (
    <AppShell
      active="today"
      academicYearLabel={workspaceContext.academicYear.label}
      workspaceName={workspaceContext.workspace.name}
      role={workspaceContext.role}
      contentClassName={styles.shellContent}
    >
      <TomorrowMaterialsContent tomorrow={tomorrow} backHref="/planner" backLabel="Oggi" />
    </AppShell>
  )
}
