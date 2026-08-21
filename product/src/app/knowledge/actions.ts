'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { KnowledgeIngestionService } from '@/core/application/knowledge-ingestion-service'
import { PlainTextKnowledgeTransformer } from '@/core/infrastructure/knowledge/plain-text-transformer'
import { SchoolCommunicationEnrichment } from '@/core/infrastructure/knowledge/school-communication-enrichment'
import { NativeKnowledgeContentPort, SupabaseKnowledgeRepository } from '@/core/infrastructure/supabase/supabase-knowledge-repository'
import { SupabasePlannerRepository } from '@/core/infrastructure/supabase/supabase-planner-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'

export async function captureKnowledgeNote(formData: FormData) {
  const titleValue = formData.get('title')
  const textValue = formData.get('text')
  const title = typeof titleValue === 'string' ? titleValue.trim() : ''
  const text = typeof textValue === 'string' ? textValue.trim() : ''
  if (!text) return

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const repository = new SupabaseKnowledgeRepository()
  const ingestion = new KnowledgeIngestionService(
    repository,
    repository,
    new NativeKnowledgeContentPort(),
    [new PlainTextKnowledgeTransformer()],
    repository,
    new SchoolCommunicationEnrichment(),
  )

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

export async function confirmKnowledgeAction(formData: FormData) {
  const unitId = stringValue(formData.get('unitId'))
  if (!unitId) return

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const knowledge = new SupabaseKnowledgeRepository()
  const unitContext = await knowledge.getUnitContext(unitId)
  if (!unitContext || unitContext.unit.workspaceId !== context.workspace.id) return
  if (unitContext.unit.unitType !== 'ACTION') return

  const existingTaskId = await knowledge.findTargetRef({
    workspaceId: context.workspace.id,
    unitId,
    relationType: 'CREATED_TASK',
    targetType: 'PLANNER_TASK',
  })

  if (existingTaskId) {
    await knowledge.setUnitValidationStatus(unitId, 'REVIEWED')
    revalidatePath(`/knowledge/${unitContext.asset.id}`)
    redirect('/planner')
  }

  const dueDate = typeof unitContext.unit.structuredData.dueDate === 'string'
    ? unitContext.unit.structuredData.dueDate
    : null

  const planner = new SupabasePlannerRepository()
  const task = await planner.create({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear?.id ?? null,
    title: unitContext.unit.title ?? unitContext.unit.content.slice(0, 240),
    notes: `Derivato da ${unitContext.document.title ?? 'contenuto KB'}\n\n${unitContext.unit.content}`,
    priority: priorityFor(dueDate),
    plannedFor: dueDate,
    sourceKind: unitContext.document.documentType === 'CIRCULAR' || unitContext.document.documentType === 'COMMUNICATION'
      ? 'COMMUNICATION'
      : 'DOCUMENT',
    sourceRef: `kb-unit:${unitId}`,
  })

  await knowledge.link({
    workspaceId: context.workspace.id,
    unitId,
    relationType: 'CREATED_TASK',
    targetType: 'PLANNER_TASK',
    targetRef: task.id,
    metadata: { sourceAssetId: unitContext.asset.id },
  })
  await knowledge.setUnitValidationStatus(unitId, 'REVIEWED')

  revalidatePath('/planner')
  revalidatePath('/knowledge')
  revalidatePath(`/knowledge/${unitContext.asset.id}`)
  redirect('/planner')
}

export async function rejectKnowledgeCandidate(formData: FormData) {
  const unitId = stringValue(formData.get('unitId'))
  if (!unitId) return

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

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

  const workspaceRepository = new SupabaseWorkspaceRepository()
  const context = await workspaceRepository.getCurrentContext()
  if (!context) redirect('/login')

  const knowledge = new SupabaseKnowledgeRepository()
  const unitContext = await knowledge.getUnitContext(unitId)
  if (!unitContext || unitContext.unit.workspaceId !== context.workspace.id) return

  await knowledge.setUnitValidationStatus(unitId, 'REVIEWED')
  revalidatePath(`/knowledge/${unitContext.asset.id}`)
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
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
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}
