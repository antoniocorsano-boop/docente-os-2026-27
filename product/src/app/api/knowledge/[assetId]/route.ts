import { NextResponse } from 'next/server'
import { SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DeleteRpcRow = {
  deleted: boolean
  storage_bucket: string | null
  storage_path: string | null
}

type DeleteRpcClient = {
  rpc: (
    name: 'delete_own_knowledge_asset',
    args: { p_asset_id: string },
  ) => Promise<{ data: DeleteRpcRow[] | null; error: { message: string } | null }>
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params
  if (!assetId) return NextResponse.json({ ok: false, code: 'missing' }, { status: 400 })

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) return NextResponse.json({ ok: false, code: 'unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) return NextResponse.json({ ok: false, code: 'unauthorized' }, { status: 401 })

  const repository = new SupabaseKnowledgeRepository()
  const asset = await repository.getById(assetId)
  if (!asset || asset.workspaceId !== context.workspace.id) {
    return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 })
  }
  if (asset.createdBy !== userId) {
    return NextResponse.json({ ok: false, code: 'forbidden' }, { status: 403 })
  }

  const { data, error } = await (supabase as unknown as DeleteRpcClient).rpc(
    'delete_own_knowledge_asset',
    { p_asset_id: assetId },
  )
  if (error) {
    console.error('Knowledge asset deletion failed', { assetId, message: error.message })
    return NextResponse.json({ ok: false, code: 'delete_failed' }, { status: 409 })
  }

  const result = data?.[0]
  if (!result?.deleted) return NextResponse.json({ ok: false, code: 'forbidden' }, { status: 403 })

  if (result.storage_bucket && result.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(result.storage_bucket)
      .remove([result.storage_path])
    if (storageError) {
      console.error('Knowledge asset storage cleanup left an orphan', {
        assetId,
        bucket: result.storage_bucket,
        path: result.storage_path,
        message: storageError.message,
      })
    }
  }

  return new NextResponse(null, { status: 204 })
}
