import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { reviewDocumentTemplate, reviewInstitutionalBase } from '@/core/application/document-template-quality'
import { SupabaseDocumentTemplateRepository } from '@/core/infrastructure/supabase/supabase-document-template-repository'
import { SupabaseInstitutionalBaseRepository } from '@/core/infrastructure/supabase/supabase-institutional-base-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { TemplateBuilder } from './TemplateBuilder'
import { buildGovernedTemplateBuilderViewModel } from './template-builder-model'
import './template-builder.css'

export const dynamic = 'force-dynamic'

export default async function DocumentTemplateBuilderPage() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  if (!context.academicYear) redirect('/')

  const institutionalBaseRepository = new SupabaseInstitutionalBaseRepository()
  const familyRepository = new SupabaseDocumentTemplateRepository()
  const [baseSummaries, familySummaries] = await Promise.all([
    institutionalBaseRepository.listForWorkspace(context.workspace.id),
    familyRepository.listForWorkspace(context.workspace.id, 'FINAL_REPORT'),
  ])

  const baseSummary = baseSummaries.find((candidate) => candidate.status !== 'RETIRED') ?? baseSummaries[0] ?? null
  const familySummary = familySummaries.find((candidate) => candidate.status !== 'RETIRED') ?? familySummaries[0] ?? null
  const [institutionalBase, familyTemplate] = await Promise.all([
    baseSummary ? institutionalBaseRepository.get(baseSummary.id) : Promise.resolve(null),
    familySummary ? familyRepository.get(familySummary.id) : Promise.resolve(null),
  ])

  const institutionalBaseCurrentVersion = institutionalBase?.versions.find(
    (candidate) => candidate.versionNo === institutionalBase.base.currentVersionNo,
  ) ?? null
  const familyCurrentVersion = familyTemplate?.versions.find(
    (candidate) => candidate.versionNo === familyTemplate.template.currentVersionNo,
  ) ?? null

  const model = buildGovernedTemplateBuilderViewModel({
    institutionalBase,
    institutionalBaseReview: institutionalBaseCurrentVersion
      ? reviewInstitutionalBase(institutionalBaseCurrentVersion.draft)
      : null,
    familyTemplate,
    familyTemplateReview: familyCurrentVersion
      ? reviewDocumentTemplate(familyCurrentVersion.draft)
      : null,
    role: context.role,
  })

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
