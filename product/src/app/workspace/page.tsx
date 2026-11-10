import { redirect } from 'next/navigation'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { isIsolatedMfaPreview } from '@/lib/supabase/mfa-isolated-preview'

export const dynamic = 'force-dynamic'

export default async function WorkspacePage() {
  // Dedicated MFA test project has no complete workspace schema.
  if (isIsolatedMfaPreview()) redirect('/sicurezza/mfa')
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) redirect('/login')
  redirect('/planner')
}
