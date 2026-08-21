'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { KnowledgeIngestionService } from '@/core/application/knowledge-ingestion-service'
import { DocxKnowledgeTransformer, ImageKnowledgeTransformer, PdfKnowledgeTransformer } from '@/core/infrastructure/knowledge/file-transformers'
import { OpenAiVisualExtraction } from '@/core/infrastructure/knowledge/openai-visual-extraction'
import { PlainTextKnowledgeTransformer } from '@/core/infrastructure/knowledge/plain-text-transformer'
import { SchoolCommunicationEnrichment } from '@/core/infrastructure/knowledge/school-communication-enrichment'
import { NativeKnowledgeContentPort, SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseStorageKnowledgeContentPort } from '@/core/infrastructure/supabase/supabase-storage-knowledge-content-port'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { createClient } from '@/lib/supabase/server'
import type { KnowledgeAssetContextInput } from '@/core/domain/knowledge'

const KNOWLEDGE_BUCKET = 'knowledge-assets'
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const ALLOWED_UPLOAD_MIMES = new Set(['application/pdf', DOCX_MIME, 'text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'image/webp'])

export async function captureKnowledgeNote(formData: FormData) {
  const titleValue = formData.get('title')
  const textValue = formData.get('text')
  const title = typeof titleValue === 'string' ? titleValue.trim() : ''
  const text = typeof textValue === 'string' ? textValue.trim() : ''
  if (!text) return

  const context = await requireWorkspaceContext()
  const repository = new SupabaseKnowledgeRepository()
  const ingestion = buildTextIngestion(repository)

  const asset = await ingestion.ingest({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear?.id ?? null,
    assetKind: 'NOTE',
    sourceProvider: 'MANUAL',
    originalName: title || null,
    originalText: text,
    mimeType: 'text/plain',
    byteSize: new TextEncoder().encode(text).byteLength,
    sourceMetadata: { captureMode: 'knowledge-inbox' },
  })

  revalidatePath('/knowledge')
  redirect(`/knowledge/${asset.id}`)
}

export async function uploadKnowledgeFile(formData: FormData) {
  const value = formData.get('file')
  if (!(value instanceof File) || value.size === 0) redirect('/knowledge?upload=missing')
  if (value.size > MAX_UPLOAD_BYTES) redirect('/knowledge?upload=too_large')

  const mimeType = normalizeMime(value.type, value.name)
  if (!ALLOWED_UPLOAD_MIMES.has(mimeType)) redirect('/knowledge?upload=unsupported')

  const context = await requireWorkspaceContext()
  const bytes = new Uint8Array(await value.arrayBuffer())
  const safeName = sanitizeFilename(value.name || 'asset')
  const objectPath = `${context.workspace.id}/${crypto.randomUUID()}-${safeName}`
  const supabase = await createClient()

  const { error: uploadError } = await supabase.storage.from(KNOWLEDGE_BUCKET).upload(objectPath, bytes, {
    contentType: mimeType,
    cacheControl: '3600',
    upsert: false,
  })

  if (uploadError) {
    console.error('Knowledge asset upload failed', uploadError.message)
    redirect('/knowledge?upload=failed')
  }

  const repository = new SupabaseKnowledgeRepository()
  const ingestion = buildFileIngestion(repository)

  try {
    const asset = await ingestion.ingest({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear?.id ?? null,
      assetKind: 'FILE',
      sourceProvider: 'UPLOAD',
      sourceLocator: `storage:${KNOWLEDGE_BUCKET}/${objectPath}`,
      originalName: value.name,
      mimeType,
      byteSize: value.size,
      sourceMetadata: {
        captureMode: 'file-upload',
        storageBucket: KNOWLEDGE_BUCKET,
        storagePath: objectPath,
        originalFilename: value.name,
      },
    })
    revalidatePath('/knowledge')
    redirect(`/knowledge/${asset.id}`)
  } catch (error) {
    console.error('Knowledge file ingestion failed', error)
    redirect('/knowledge?upload=parse_failed')
  }
}

export async function reprocessKnowledgeAsset(formData: FormData) {
  const assetId = stringValue(formData.get('assetId'))
  if (!assetId) return
  const context = await requireWorkspaceContext()
  const repository = new SupabaseKnowledgeRepository()
  const asset = await repository.getById(assetId)
  if (!asset || asset.workspaceId !== context.workspace.id) return

  const ingestion = asset.sourceProvider === 'UPLOAD' ? buildFileIngestion(repository) : buildTextIngestion(repository)
  try {
    await ingestion.reprocess(assetId)
    revalidatePath('/knowledge')
    revalidatePath(`/knowledge/${assetId}`)
    redirect(`/knowledge/${assetId}?reprocess=ok`)
  } catch (error) {
    console.error('Knowledge reprocessing failed', error)
    revalidatePath(`/knowledge/${assetId}`)
    redirect(`/knowledge/${assetId}?reprocess=failed`)
  }
}

export async function updateKnowledgeContext(formData: FormData) {
  const assetId = stringValue(formData.get('assetId'))
  if (!assetId) return
  const context = await requireWorkspaceContext()
  const repository = new SupabaseKnowledgeRepository()
  const asset = await repository.getById(assetId)
  if (!asset || asset.workspaceId !== context.workspace.id) return

  const input: KnowledgeAssetContextInput = {
    academicYearId: nullableString(formData.get('academicYearId')),
    contentCategory: enumValue(formData.get('contentCategory'), CONTENT_CATEGORIES, 'OTHER'),
    disciplines: listValue(formData.get('disciplines')),
    classLabels: listValue(formData.get('classLabels')),
    contextStatus: enumValue(formData.get('contextStatus'), CONTEXT_STATUSES, 'UNCLASSIFIED'),
    reliability: enumValue(formData.get('reliability'), RELIABILITIES, 'AUTO'),
  }
  await repository.updateContext(assetId, input)
  revalidatePath('/knowledge')
  revalidatePath(`/knowledge/${assetId}`)
  redirect(`/knowledge/${assetId}?context=updated`)
}

export async function confirmKnowledgeAction(formData: FormData) {
  const unitId = stringValue(formData.get('unitId'))
  if (!unitId) return
  const context = await requireWorkspaceContext()
  const knowledge = new SupabaseKnowledgeRepository()
  const unitContext = await knowledge.getUnitContext(unitId)
  if (!unitContext || unitContext.unit.workspaceId !== context.workspace.id || unitContext.unit.unitType !== 'ACTION') return

  const existingTaskId = await knowledge.findTargetRef({ workspaceId: context.workspace.id, unitId, relationType: 'CREATED_TASK', targetType: 'PLANNER_TASK' })
  if (existingTaskId) {
    await knowledge.setUnitValidationStatus(unitId, 'REVIEWED')
    revalidatePath(`/knowledge/${unitContext.asset.id}`)
    redirect('/planner')
  }

  const dueDate = typeof unitContext.unit.structuredData.dueDate === 'string' ? unitContext.unit.structuredData.dueDate : null
  const planner = new SupabasePlannerRepository()
  const task = await planner.create({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear?.id ?? null,
    title: unitContext.unit.title ?? unitContext.unit.content.slice(0, 240),
    notes: `Derivato da ${unitContext.document.title ?? 'contenuto KB'}\n\n${unitContext.unit.content}`,
    priority: priorityFor(dueDate),
    plannedFor: dueDate,
    sourceKind: unitContext.document.documentType === 'CIRCULAR' || unitContext.document.documentType === 'COMMUNICATION' ? 'COMMUNICATION' : 'DOCUMENT',
    sourceRef: `kb-unit:${unitId}`,
  })
  await knowledge.link({ workspaceId: context.workspace.id, unitId, relationType: 'CREATED_TASK', targetType: 'PLANNER_TASK', targetRef: task.id, metadata: { sourceAssetId: unitContext.asset.id } })
  await knowledge.setUnitValidationStatus(unitId, 'REVIEWED')
  revalidatePath('/planner')
  revalidatePath('/knowledge')
  revalidatePath(`/knowledge/${unitContext.asset.id}`)
  redirect('/planner')
}

export async function rejectKnowledgeCandidate(formData: FormData) {
  const unitId = stringValue(formData.get('unitId'))
  if (!unitId) return
  const context = await requireWorkspaceContext()
  const knowledge = new SupabaseKnowledgeRepository()
  const unitContext = await knowledge.getUnitContext(unitId)
  if (!unitContext || unitContext.unit.workspaceId !== context.workspace.id) return
  if (unitContext.unit.unitType !== 'ACTION' && unitContext.unit.unitType !== 'DEADLINE') return
  await knowledge.setUnitValidationStatus(unitId, 'REJECTED')
  revalidatePath(`/knowledge/${unitContext.asset.id}`)
}

export async function confirmKnowledgeCandidate(formData: FormData) {
  const unitId = stringValue(formData.get('unitId'))
  if (!unitId) return
  const context = await requireWorkspaceContext()
  const knowledge = new SupabaseKnowledgeRepository()
  const unitContext = await knowledge.getUnitContext(unitId)
  if (!unitContext || unitContext.unit.workspaceId !== context.workspace.id) return
  await knowledge.setUnitValidationStatus(unitId, 'REVIEWED')
  revalidatePath(`/knowledge/${unitContext.asset.id}`)
}

function buildTextIngestion(repository: SupabaseKnowledgeRepository) {
  return new KnowledgeIngestionService(
    repository,
    repository,
    repository,
    new NativeKnowledgeContentPort(),
    [new PlainTextKnowledgeTransformer()],
    repository,
    new SchoolCommunicationEnrichment(),
  )
}

function buildFileIngestion(repository: SupabaseKnowledgeRepository) {
  const visualExtraction = new OpenAiVisualExtraction()
  return new KnowledgeIngestionService(
    repository,
    repository,
    repository,
    new SupabaseStorageKnowledgeContentPort(),
    [new PlainTextKnowledgeTransformer(), new PdfKnowledgeTransformer(visualExtraction), new DocxKnowledgeTransformer(), new ImageKnowledgeTransformer(visualExtraction)],
    repository,
    new SchoolCommunicationEnrichment(),
  )
}

async function requireWorkspaceContext() {
  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')
  return context
}

function normalizeMime(rawMime: string, filename: string) {
  if (rawMime && ALLOWED_UPLOAD_MIMES.has(rawMime)) return rawMime
  const extension = filename.toLowerCase().split('.').pop()
  if (extension === 'pdf') return 'application/pdf'
  if (extension === 'docx') return DOCX_MIME
  if (extension === 'md' || extension === 'markdown') return 'text/markdown'
  if (extension === 'txt') return 'text/plain'
  if (extension === 'png') return 'image/png'
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'webp') return 'image/webp'
  return rawMime || 'application/octet-stream'
}

function sanitizeFilename(filename: string) {
  const normalized = filename.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  const safe = normalized.replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '')
  return (safe || 'asset').slice(-160)
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const CONTENT_CATEGORIES = ['CIRCULAR', 'MODEL', 'PROGRAMMING', 'UDA', 'ASSESSMENT', 'TEACHING_RESOURCE', 'COMMUNICATION', 'OTHER'] as const
const CONTEXT_STATUSES = ['UNCLASSIFIED', 'REVIEWED', 'NEEDS_REVIEW'] as const
const RELIABILITIES = ['AUTO', 'VERIFIED', 'TO_VERIFY'] as const

function nullableString(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function listValue(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return []
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, 20)
}

function enumValue<T extends string>(value: FormDataEntryValue | null, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback
}

function priorityFor(dueDate: string | null) {
  if (!dueDate) return 'NORMAL' as const
  const today = currentRomeDate()
  const delta = Math.round((Date.parse(`${dueDate}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000)
  if (delta < 0) return 'URGENT' as const
  if (delta <= 3) return 'HIGH' as const
  return 'NORMAL' as const
}

function currentRomeDate() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}
