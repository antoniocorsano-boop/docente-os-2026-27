import { NextResponse } from 'next/server'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const STORAGE_BUCKET = 'knowledge-assets'

type ExportRpcClient = {
  rpc: (name: 'workspace_export_manifest') => Promise<{
    data: unknown
    error: { message: string } | null
  }>
}

type ExportManifest = {
  schemaVersion?: number
  generatedAt?: string
  identity?: Record<string, unknown>
  data?: Record<string, unknown[]>
}

export async function GET() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()

  if (!context) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (context.role !== 'OWNER') {
    return NextResponse.json({ error: 'Workspace owner required' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await (supabase as unknown as ExportRpcClient).rpc('workspace_export_manifest')

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Workspace export failed' }, { status: 500 })
  }

  const manifest = data as ExportManifest
  const { data: storageObjects, error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(context.workspace.id, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    })

  if (storageError) {
    return NextResponse.json({ error: `Storage inventory failed: ${storageError.message}` }, { status: 500 })
  }

  const storage = (storageObjects ?? []).map((item) => ({
    bucket: STORAGE_BUCKET,
    path: `${context.workspace.id}/${item.name}`,
    name: item.name,
    id: item.id,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    metadata: item.metadata,
  }))

  const tables = manifest.data ?? {}
  const counts = Object.fromEntries(Object.entries(tables).map(([table, rows]) => [table, rows.length]))
  const storageBytes = storage.reduce((total, item) => {
    const metadata = item.metadata as { size?: number } | null
    return total + (typeof metadata?.size === 'number' ? metadata.size : 0)
  }, 0)

  const exportPayload = {
    ...manifest,
    exportKind: 'DOCENTE_OS_WORKSPACE_EXPORT',
    workspace: {
      id: context.workspace.id,
      name: context.workspace.name,
      kind: context.workspace.kind,
      role: context.role,
      activeAcademicYear: context.academicYear,
    },
    inventory: {
      tableCounts: counts,
      storage: {
        bucket: STORAGE_BUCKET,
        objectCount: storage.length,
        byteSize: storageBytes,
        objects: storage,
      },
    },
    deletionReady: false,
    note: 'Questo export non modifica o elimina alcun dato. La cancellazione richiede un flusso separato e confermato.',
  }

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="docente-os-workspace-${date}.json"`,
      'cache-control': 'no-store',
    },
  })
}
