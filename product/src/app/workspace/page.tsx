import { redirect } from 'next/navigation'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export const dynamic = 'force-dynamic'

export default async function WorkspacePage() {
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) redirect('/login')
  redirect('/planner')
}
