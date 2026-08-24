import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { SupabaseAuthoredDocumentRepository } from '@/core/infrastructure/supabase/supabase-authored-document-repository'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { humanizeKnowledgeTitle } from '@/core/presentation/product-language'
import { PrintExportButton } from './PrintExportButton'
import { exportBlocks, selectExportVersion } from './export-model'
import './uda-export.css'

export const dynamic = 'force-dynamic'

type ExportSearchParams = { version?: string }

export default async function UdaExportPage({ params, searchParams }: { params: Promise<{ documentId: string }>; searchParams: Promise<ExportSearchParams> }) {
  const { documentId } = await params
  const query = await searchParams
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const authoredRepository = new SupabaseAuthoredDocumentRepository()
  const snapshot = await authoredRepository.get(documentId)
  if (!snapshot || snapshot.document.workspaceId !== context.workspace.id) notFound()

  const version = selectExportVersion(snapshot, query.version)
  if (!version) notFound()

  const knowledgeRepository = new SupabaseKnowledgeRepository()
  const source = await knowledgeRepository.getById(snapshot.document.sourceAssetId)
  if (!source || source.workspaceId !== context.workspace.id) notFound()

  const blocks = exportBlocks(version.bodyMarkdown)
  const sourceTitle = humanizeKnowledgeTitle(source.originalName ?? 'Fonte UDA')

  return (
    <main className="udaExportPage">
      <nav className="udaExportActions" aria-label="Azioni esportazione">
        <Link href={`/progetta/documenti/${encodeURIComponent(documentId)}`}>Torna al documento</Link>
        <PrintExportButton />
      </nav>

      <article className="udaExportDocument" aria-labelledby="uda-export-title">
        <header className="udaExportHeader">
          <p className="udaExportEyebrow">UNITÀ DI APPRENDIMENTO</p>
          <h1 id="uda-export-title">{version.title}</h1>
          <dl>
            <div><dt>Anno scolastico</dt><dd>{context.academicYear?.label ?? 'Non indicato'}</dd></div>
            <div><dt>Versione</dt><dd>{version.versionNo}</dd></div>
            <div><dt>Documento di lavoro</dt><dd>DOCENTE OS</dd></div>
          </dl>
        </header>

        <section className="udaExportBody" aria-label="Contenuto UDA">
          {blocks.map((block, index) => <ExportBlockView block={block} index={index} key={`${block.kind}-${index}`} />)}
        </section>

        <footer className="udaExportProvenance">
          <strong>Provenienza</strong>
          <p>Documento di lavoro derivato da: {sourceTitle}.</p>
          <p>Fonte originale preservata · versione esportata v{version.versionNo} · versione salvata il {new Date(version.createdAt).toLocaleString('it-IT')}.</p>
        </footer>
      </article>
    </main>
  )
}

function ExportBlockView({ block, index }: { block: ReturnType<typeof exportBlocks>[number]; index: number }) {
  if (block.kind === 'blank') return <div className="udaExportBlank" aria-hidden />
  if (block.kind === 'heading') {
    if (block.level === 1) return <h2>{block.text}</h2>
    if (block.level === 2) return <h3>{block.text}</h3>
    return <h4>{block.text}</h4>
  }
  if (block.kind === 'bullet') return <p className="udaExportListItem"><span aria-hidden>•</span>{block.text}</p>
  if (block.kind === 'numbered') return <p className="udaExportListItem"><span aria-hidden>{index + 1}.</span>{block.text}</p>
  return <p>{block.text}</p>
}
