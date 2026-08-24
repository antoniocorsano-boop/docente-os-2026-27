import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell/app-shell'
import { SupabaseAuthoredDocumentRepository } from '@/core/infrastructure/supabase/supabase-authored-document-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { UdaAuthoringEditor } from './UdaAuthoringEditor'
import './uda-authoring.css'

export const dynamic = 'force-dynamic'

export default async function UdaAuthoringPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const repository = new SupabaseAuthoredDocumentRepository()
  const snapshot = await repository.get(documentId)
  if (!snapshot || snapshot.document.workspaceId !== context.workspace.id) notFound()

  return (
    <AppShell active="design" academicYearLabel={context.academicYear?.label} workspaceName={context.workspace.name} role={context.role} contentClassName="udaAuthoringSurface">
      <header className="udaAuthoringHeader">
        <div><p>PROGETTA · UDA</p><h1>{snapshot.document.title}</h1><span>Documento di lavoro versionato · fonte originale preservata</span></div>
        <nav>
          <Link className="primary" href={`/progetta/documenti/${encodeURIComponent(documentId)}/export?version=${snapshot.document.currentVersionNo}`}>Esporta PDF</Link>
          <Link href={`/knowledge/${snapshot.document.sourceAssetId}`}>Apri fonte</Link>
          <Link href="/progetta">Torna a Progetta</Link>
        </nav>
      </header>
      <UdaAuthoringEditor snapshot={snapshot} />
    </AppShell>
  )
}
