import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { redirect } from 'next/navigation'
import { AtlasMaterialReturnReview } from './AtlasMaterialReturnReview'
import './atlas-material-return.css'

export const dynamic = 'force-dynamic'

export default async function AtlasMaterialReturnPage() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  return (
    <AppShell active="design" academicYearLabel={context.academicYear?.label} workspaceName={context.workspace.name} role={context.role} contentClassName="atlasMaterialReturnSurface">
      <AtlasMaterialReturnReview />
    </AppShell>
  )
}
