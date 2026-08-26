import { Buffer } from 'node:buffer'
import { NextResponse } from 'next/server'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { createClient } from '@/lib/supabase/server'
import { inspectFilenameForPilot, inspectFreeTextForPilot } from '@/core/privacy/anonymization-guard'
import {
  buildKnowledgeObjectPath,
  isAllowedKnowledgeUploadMime,
  KNOWLEDGE_BUCKET,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  normalizeKnowledgeUploadMime,
} from '@/app/knowledge/upload-policy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UploadResponse =
  | { ok: true; objectPath: string; mimeType: string; byteSize: number }
  | { ok: false; code: 'missing' | 'too_large' | 'unsupported' | 'unauthorized' | 'size_mismatch' | 'storage_failed' | 'privacy_confirmation_required' | 'privacy_blocked' }

export async function POST(request: Request) {
  const encodedName = request.headers.get('x-docente-file-name') ?? ''
  const declaredSize = Number(request.headers.get('x-docente-file-size') ?? '')
  const rawMimeType = request.headers.get('content-type') ?? ''
  const privacyConfirmed = request.headers.get('x-docente-anonymous-confirmed') === 'true'

  if (!privacyConfirmed) return json({ ok: false, code: 'privacy_confirmation_required' }, 400)

  let originalName = ''
  try {
    originalName = decodeURIComponent(encodedName).trim()
  } catch {
    return json({ ok: false, code: 'missing' }, 400)
  }

  if (!originalName || !Number.isInteger(declaredSize) || declaredSize <= 0) return json({ ok: false, code: 'missing' }, 400)
  if (declaredSize > MAX_KNOWLEDGE_UPLOAD_BYTES) return json({ ok: false, code: 'too_large' }, 413)
  if (!inspectFilenameForPilot(originalName).allowed) return json({ ok: false, code: 'privacy_blocked' }, 422)

  const mimeType = normalizeKnowledgeUploadMime(rawMimeType, originalName)
  if (!isAllowedKnowledgeUploadMime(mimeType)) return json({ ok: false, code: 'unsupported' }, 415)

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) return json({ ok: false, code: 'unauthorized' }, 401)

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || !userId) return json({ ok: false, code: 'unauthorized' }, 401)

  let bytes: ArrayBuffer
  try {
    bytes = await request.arrayBuffer()
  } catch (error) {
    console.error('Knowledge same-origin upload body read failed', error)
    return json({ ok: false, code: 'storage_failed' }, 400)
  }

  const actualSize = bytes.byteLength
  if (actualSize <= 0) return json({ ok: false, code: 'missing' }, 400)
  if (actualSize > MAX_KNOWLEDGE_UPLOAD_BYTES) return json({ ok: false, code: 'too_large' }, 413)
  if (actualSize !== declaredSize) {
    console.error('Knowledge same-origin upload size mismatch', { declaredSize, actualSize })
    return json({ ok: false, code: 'size_mismatch' }, 400)
  }

  if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    if (!inspectFreeTextForPilot(text).allowed) return json({ ok: false, code: 'privacy_blocked' }, 422)
  }

  const objectPath = buildKnowledgeObjectPath(context.workspace.id, userId, originalName, crypto.randomUUID())
  const { error } = await supabase.storage.from(KNOWLEDGE_BUCKET).upload(objectPath, Buffer.from(bytes), {
    contentType: mimeType,
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    console.error('Knowledge same-origin storage upload failed', {
      message: error.message,
      workspaceId: context.workspace.id,
      userId,
      bucket: KNOWLEDGE_BUCKET,
      objectPath,
      byteSize: actualSize,
      mimeType,
    })
    return json({ ok: false, code: 'storage_failed' }, 502)
  }

  return json({ ok: true, objectPath, mimeType, byteSize: actualSize }, 201)
}

function json(body: UploadResponse, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
