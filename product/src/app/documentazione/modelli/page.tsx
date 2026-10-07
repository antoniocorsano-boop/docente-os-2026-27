import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { reviewDocumentTemplate } from '@/core/application/document-template-quality'
import { finalReportCanonicalTemplate } from '@/core/presentation/final-report-canonical-template'
import type { DocumentTemplateSnapshot } from '@/core/infrastructure/supabase/supabase-document-template-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { TemplateBuilder } from './TemplateBuilder'
import { buildTemplateBuilderViewModel } from './template-builder-model'
import './template-builder.css'

export const dynamic = 'force-dynamic'

export default async function DocumentTemplateBuilderPage() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/')

  const draft = finalReportCanonicalTemplate()
  const snapshot: DocumentTemplateSnapshot = {
    template: {
      id: 'pilot-final-report-template',
      workspaceId: context.workspace.id,
      kind: draft.kind,
      name: draft.name,
      status: 'DRAFT',
      currentVersionNo: 1,
      activeVersionNo: null,
      createdBy: 'human-review-pending',
      createdAt: '2026-10-07T00:00:00Z',
      updatedAt: '2026-10-07T00:00:00Z',
    },
    activeVersion: null,
    versions: [{
      id: 'pilot-final-report-template-v1',
      templateId: 'pilot-final-report-template',
      versionNo: 1,
      draft,
      sourceRevisionIds: [],
      createdBy: 'human-review-pending',
      createdAt: '2026-10-07T00:00:00Z',
    }],
    qualityReviews: [],
    sources: [],
  }
  const model = buildTemplateBuilderViewModel(snapshot, reviewDocumentTemplate(draft))

  return (
    <AppShell
      active="documentation"
      academicYearLabel={context.academicYear.label}
      workspaceName={context.workspace.name}
      role={context.role}
    >
      <TemplateBuilder model={model} />
    </AppShell>
  )
}
