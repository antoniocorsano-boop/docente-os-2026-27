'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TimetablePresenceKind } from '@/core/domain/timetable'
import { OpenAiTimetableDocumentExtractor } from '@/core/infrastructure/ai/openai-timetable-document-extractor'
import { SupabaseAnnualPlanExecutionRepository } from '@/core/infrastructure/supabase/supabase-annual-plan-execution-repository'
import { SupabaseTeacherSettingsRepository } from '@/core/infrastructure/supabase/supabase-teacher-settings-repository'
import { SupabaseTimetableImportRepository } from '@/core/infrastructure/supabase/supabase-timetable-import-repository'
import { SupabaseTimetableLifecycleRepository } from '@/core/infrastructure/supabase/supabase-timetable-lifecycle-repository'
import { updateDraftTimetableSlot } from '@/core/infrastructure/supabase/supabase-timetable-slot-editor'
import { SupabaseTimetableRepository } from '@/core/infrastructure/supabase/supabase-timetable-repository'
import { SupabaseWorkspaceRepository } from '@/core/infrastructure/supabase/supabase-workspace-repository'
import { validateKnowledgeUploadContent } from '../knowledge/upload-content-validation'
import { isValidIsoCalendarDate, resolveTimetableSourceIdentity } from './timetable-import-boundary'
import {
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  normalizeKnowledgeUploadMime,
} from '../knowledge/upload-policy'

export async function addTeachingAssignment(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.addAssignment({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    sectionId: text(formData, 'sectionId'),
    disciplineId: text(formData, 'disciplineId'),
    weeklyMinutes: integer(formData, 'weeklyMinutes'),
    sourceNote: nullableText(formData, 'sourceNote'),
  })
  revalidatePath('/orario')
}

export async function updateTeachingAssignment(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.updateAssignment({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    assignmentId: text(formData, 'assignmentId'),
    weeklyMinutes: integer(formData, 'weeklyMinutes'),
    status: text(formData, 'status') === 'CONFIRMED' ? 'CONFIRMED' : 'PROVISIONAL',
  })
  revalidatePath('/orario')
}

export async function updateTimetableDraft(formData: FormData) {
  const context = await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.updateDraftVersion({
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
    versionId: text(formData, 'versionId'),
    label: text(formData, 'label'),
    effectiveFrom: text(formData, 'effectiveFrom'),
    sourceKind: sourceKind(text(formData, 'sourceKind')),
    sourceRef: nullableText(formData, 'sourceRef'),
  })
  revalidatePath('/orario')
}

export async function activateTimetableDraft(formData: FormData) {
  await requireContext()
  const repository = new SupabaseTimetableLifecycleRepository()
  await repository.activateDraft(text(formData, 'versionId'))
  revalidatePath('/')
  revalidatePath('/orario')
}

export async function addLessonSlot(formData: FormData) {
  await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.addLessonSlot({
    versionId: text(formData, 'versionId'),
    assignmentId: text(formData, 'assignmentId'),
    weekday: integer(formData, 'weekday'),
    startTime: text(formData, 'startTime'),
    endTime: text(formData, 'endTime'),
    ordinal: optionalInteger(formData, 'ordinal'),
    room: nullableText(formData, 'room'),
    note: nullableText(formData, 'note'),
  })
  revalidatePath('/orario')
}

export async function addClassPresenceSlot(formData: FormData) {
  await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.addClassPresenceSlot({
    versionId: text(formData, 'versionId'),
    weekday: integer(formData, 'weekday'),
    startTime: text(formData, 'startTime'),
    endTime: text(formData, 'endTime'),
    ordinal: optionalInteger(formData, 'ordinal'),
    manualClassLabel: text(formData, 'manualClassLabel'),
    presenceKind: presenceKind(text(formData, 'presenceKind')),
    room: nullableText(formData, 'room'),
    note: nullableText(formData, 'note'),
  })
  revalidatePath('/orario')
}

export async function addSpecialSlot(formData: FormData) {
  await requireContext()
  const kindValue = text(formData, 'kind')
  if (kindValue !== 'DISPOSITION' && kindValue !== 'RECEPTION' && kindValue !== 'OTHER') {
    throw new Error('Unsupported special slot kind')
  }
  const repository = new SupabaseTimetableRepository()
  await repository.addSpecialSlot({
    versionId: text(formData, 'versionId'),
    kind: kindValue,
    weekday: integer(formData, 'weekday'),
    startTime: text(formData, 'startTime'),
    endTime: text(formData, 'endTime'),
    ordinal: optionalInteger(formData, 'ordinal'),
    note: nullableText(formData, 'note'),
  })
  revalidatePath('/orario')
}

export async function updateTimetableSlot(formData: FormData) {
  await requireContext()
  const kind = timetableSlotKind(text(formData, 'kind'))
  await updateDraftTimetableSlot({
    versionId: text(formData, 'versionId'),
    slotId: text(formData, 'slotId'),
    kind,
    assignmentId: kind === 'LESSON' ? text(formData, 'assignmentId') : null,
    manualClassLabel: kind === 'CLASS_PRESENCE' ? text(formData, 'manualClassLabel') : null,
    presenceKind: kind === 'CLASS_PRESENCE' ? presenceKind(text(formData, 'presenceKind')) : null,
    weekday: integer(formData, 'weekday'),
    startTime: text(formData, 'startTime'),
    endTime: text(formData, 'endTime'),
    ordinal: optionalInteger(formData, 'ordinal'),
    room: kind === 'LESSON' || kind === 'CLASS_PRESENCE' ? nullableText(formData, 'room') : null,
    note: nullableText(formData, 'note'),
  })
  revalidatePath('/orario')
}

export async function deleteTimetableSlot(formData: FormData) {
  await requireContext()
  const repository = new SupabaseTimetableRepository()
  await repository.deleteSlot(text(formData, 'versionId'), text(formData, 'slotId'))
  revalidatePath('/orario')
}


export async function analyzeTimetableImport(formData: FormData) {
  const result = await analyzeTimetableImportResult(formData)
  if (!result.ok) redirect(`/orario/aggiorna?import=${encodeURIComponent(result.code)}`)
  redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(result.candidateId)}&import=review`)
}

export async function analyzeMinimizedTimetableImport(formData: FormData) {
  const requestedMode = optionalText(formData, 'sourceMode')
  formData.set(
    'sourceMode',
    requestedMode === 'LOCAL_MINIMIZED_UPLOAD' ? 'LOCAL_MINIMIZED_UPLOAD' : 'LOCAL_MINIMIZED_SHARE',
  )
  return analyzeTimetableImportResult(formData)
}

export async function analyzeRasterTimetableImport(formData: FormData) {
  const requestedMode = optionalText(formData, 'sourceMode')
  formData.set(
    'sourceMode',
    requestedMode === 'LOCAL_MINIMIZED_UPLOAD' || requestedMode === 'LOCAL_RASTER_PAGE_UPLOAD'
      ? 'LOCAL_RASTER_PAGE_UPLOAD'
      : 'LOCAL_RASTER_PAGE_SHARE',
  )
  return analyzeTimetableImportResult(formData)
}

async function analyzeTimetableImportResult(formData: FormData) {
  const context = await requireContext()

  const value = formData.get('file')
  if (!(value instanceof File) || value.size === 0) return { ok: false as const, code: 'missing' }
  if (value.size > MAX_KNOWLEDGE_UPLOAD_BYTES) return { ok: false as const, code: 'too_large' }

  const mimeType = normalizeKnowledgeUploadMime(value.type, value.name)
  if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
    return { ok: false as const, code: 'unsupported' }
  }

  const effectiveFrom = text(formData, 'effectiveFrom').trim()
  if (
    !isValidIsoCalendarDate(effectiveFrom)
    || effectiveFrom < context.academicYear.startsOn
    || effectiveFrom > context.academicYear.endsOn
  ) {
    return { ok: false as const, code: 'invalid_date' }
  }

  const teacherLabel = text(formData, 'teacherLabel').trim()
  if (!teacherLabel || teacherLabel.length > 120) return { ok: false as const, code: 'teacher_required' }

  const bytes = new Uint8Array(await value.arrayBuffer())
  const validation = await validateKnowledgeUploadContent({
    filename: value.name,
    mimeType,
    bytes,
  })
  if (!validation.valid) return { ok: false as const, code: 'invalid_content' }

  const derivativeFingerprint = createHash('sha256').update(bytes).digest('hex')
  const sourceMode = optionalText(formData, 'sourceMode')
  const originalSourceFingerprint = optionalText(formData, 'originalSourceFingerprint')
  const sourceIdentity = resolveTimetableSourceIdentity({
    sourceMode,
    derivativeFingerprint,
    originalSourceFingerprint,
    derivativeName: value.name,
  })
  const fingerprint = sourceIdentity.sourceFingerprint
  const sourceLabel = sourceIdentity.sourceLabel
  const replaceReviewed = optionalText(formData, 'replaceReviewedCandidate') === 'yes'
  const importRepository = new SupabaseTimetableImportRepository()

  const settingsRepository = new SupabaseTeacherSettingsRepository()
  const annualRepository = new SupabaseAnnualPlanExecutionRepository()
  const timetableRepository = new SupabaseTimetableRepository()

  const [settings, annualSnapshot, timetable] = await Promise.all([
    settingsRepository.getOrCreate(context.workspace.id, context.academicYear.id),
    annualRepository.list(context.workspace.id, context.academicYear.id),
    timetableRepository.list(
      context.workspace.id,
      context.academicYear.id,
      context.academicYear.startsOn,
    ),
  ])

  const sectionLabels = new Map(
    annualSnapshot.sections.map((section) => [
      section.id,
      compactClassLabel(section.grade, section.sectionCode),
    ]),
  )
  const sectionIdByClass = new Map(
    [...sectionLabels.entries()].map(([id, label]) => [normalizeClassKey(label), id]),
  )
  const assignmentsBySection = new Map<string, typeof timetable.assignments>()
  for (const assignment of timetable.assignments) {
    const current = assignmentsBySection.get(assignment.sectionId) ?? []
    assignmentsBySection.set(assignment.sectionId, [...current, assignment])
  }

  const extractor = new OpenAiTimetableDocumentExtractor()
  let extracted
  try {
    extracted = await extractor.extract({
      bytes,
      mimeType,
      filename: value.name || 'orario',
      teacherLabel,
      knownClassLabels: [...sectionLabels.values()],
    })
  } catch {
    return { ok: false as const, code: 'parse_failed' }
  }

  if (!extracted.rows.length) return { ok: false as const, code: 'no_rows' }

  const rows = extracted.rows.map((row) => {
    const sectionId = sectionIdByClass.get(normalizeClassKey(row.classLabel)) ?? null
    const assignments = sectionId ? assignmentsBySection.get(sectionId) ?? [] : []
    const assignment = assignments.length === 1 ? assignments[0] : null
    const period = periodForOrdinal(
      settings.schoolDayStart,
      settings.defaultPeriodMinutes,
      settings.dailyPeriodCount,
      row.ordinal,
    )
    const highConfidence = typeof row.confidence === 'number' && row.confidence >= 0.85
    const autoResolved = Boolean(assignment && period && highConfidence)
    const warnings = [
      ...(sectionId ? [] : ['CLASS_NOT_RESOLVED']),
      ...(sectionId && assignments.length !== 1 ? ['ASSIGNMENT_NOT_UNIQUE'] : []),
      ...(period ? [] : ['PERIOD_NOT_CONFIGURED']),
      ...(highConfidence ? [] : ['SOURCE_REQUIRES_REVIEW']),
    ]

    return {
      rowKey: `${row.day}:${row.ordinal}:${normalizeClassKey(row.classLabel)}`,
      weekday: row.day,
      ordinal: row.ordinal,
      startTime: period?.start ?? null,
      endTime: period?.end ?? null,
      sourceClassLabel: row.classLabel,
      resolvedSectionId: assignment?.sectionId ?? sectionId,
      resolvedAssignmentId: assignment?.id ?? null,
      confidence: highConfidence ? 'HIGH' as const : 'MEDIUM' as const,
      reviewState: autoResolved ? 'AUTO_RESOLVED' as const : 'REVIEW_REQUIRED' as const,
      evidenceRef: row.evidenceRef,
      warnings,
    }
  })

  let candidate
  try {
    candidate = await importRepository.replaceCandidateAtomic({
      workspaceId: context.workspace.id,
      academicYearId: context.academicYear.id,
      sourceFingerprint: fingerprint,
      sourceLabel,
      sourceRef: sourceIdentity.sourceRef,
      effectiveFrom,
      parserVersion: `${extracted.processor}@${extracted.processorVersion}`,
      replaceReviewed,
      rows,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('SOURCE_ALREADY_APPLIED')) {
      return { ok: false as const, code: 'already_applied' }
    }
    if (message.includes('REPLACEMENT_CONFIRMATION_REQUIRED')) {
      return { ok: false as const, code: 'replace_confirmation_required' }
    }
    return { ok: false as const, code: 'persist_failed' }
  }

  revalidatePath('/orario')
  return { ok: true as const, candidateId: candidate.id }
}

export async function addTimetableImportRow(formData: FormData) {
  const context = await requireContext()
  const candidateId = text(formData, 'candidateId')
  const repository = new SupabaseTimetableImportRepository()
  const candidate = await repository.getReview({
    candidateId,
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
  })
  if (!candidate || candidate.state === 'APPLIED_TO_DRAFT') redirect('/orario/aggiorna?import=unavailable')
  const reviewedRevision = integer(formData, 'candidateRevision')
  if (candidate.revision !== reviewedRevision) {
    redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=review_stale`)
  }

  try {
    await repository.addManualRow({
      candidateId,
      candidateRevision: reviewedRevision,
      assignmentId: text(formData, 'assignmentId'),
      weekday: integer(formData, 'weekday'),
      ordinal: integer(formData, 'ordinal'),
      startTime: text(formData, 'startTime'),
      endTime: text(formData, 'endTime'),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('STALE_CANDIDATE_REVISION')) {
      redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=review_stale`)
    }
    redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=persist_failed`)
  }

  revalidatePath('/orario')
  redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=review`)
}

export async function updateTimetableImportRow(formData: FormData) {
  const context = await requireContext()
  const candidateId = text(formData, 'candidateId')
  const repository = new SupabaseTimetableImportRepository()
  const candidate = await repository.getReview({
    candidateId,
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
  })
  if (!candidate || candidate.state === 'APPLIED_TO_DRAFT') redirect('/orario/aggiorna?import=unavailable')
  const reviewedRevision = integer(formData, 'candidateRevision')
  if (candidate.revision !== reviewedRevision) {
    redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=review_stale`)
  }

  try {
    await repository.updateRow({
      candidateId,
      candidateRevision: reviewedRevision,
      rowId: text(formData, 'rowId'),
      assignmentId: text(formData, 'assignmentId'),
      weekday: integer(formData, 'weekday'),
      ordinal: integer(formData, 'ordinal'),
      startTime: text(formData, 'startTime'),
      endTime: text(formData, 'endTime'),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('STALE_CANDIDATE_REVISION')) {
      redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=review_stale`)
    }
    redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=persist_failed`)
  }

  revalidatePath('/orario')
  redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=review`)
}

export async function applyTimetableImportCandidate(formData: FormData) {
  const context = await requireContext()
  const candidateId = text(formData, 'candidateId')
  const repository = new SupabaseTimetableImportRepository()
  const candidate = await repository.getReview({
    candidateId,
    workspaceId: context.workspace.id,
    academicYearId: context.academicYear.id,
  })

  if (!candidate || candidate.state !== 'READY_TO_CONFIRM') {
    redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=not_ready`)
  }

  const reviewedRevision = integer(formData, 'candidateRevision')
  if (candidate.revision !== reviewedRevision) {
    redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=review_stale`)
  }

  try {
    await repository.apply({
      candidateId,
      candidateRevision: reviewedRevision,
      draftVersionId: text(formData, 'draftVersionId'),
      expectedDraftToken: text(formData, 'expectedDraftToken'),
      confirmationRequestId: text(formData, 'confirmationRequestId'),
      teacherCompleteConfirmed: text(formData, 'teacherCompleteConfirmed') === 'yes',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const code = message.includes('CONFLICT_DETECTED') ? 'conflict' : 'apply_failed'
    redirect(`/orario/aggiorna?importCandidate=${encodeURIComponent(candidateId)}&import=${code}`)
  }

  revalidatePath('/')
  revalidatePath('/orario')
  redirect('/orario/aggiorna?import=applied')
}


async function requireContext() {
  const repository = new SupabaseWorkspaceRepository()
  const context = await repository.getCurrentContext()
  if (!context) throw new Error('Authenticated workspace required')
  if (!context.academicYear) throw new Error('Active academic year required')
  return { ...context, academicYear: context.academicYear }
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== 'string') throw new Error(`${key} required`)
  return value
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key).trim()
  return value || null
}

function optionalText(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function integer(formData: FormData, key: string) {
  const value = Number(text(formData, key))
  if (!Number.isInteger(value)) throw new Error(`${key} must be an integer`)
  return value
}

function optionalInteger(formData: FormData, key: string) {
  const raw = text(formData, key).trim()
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isInteger(value)) throw new Error(`${key} must be an integer`)
  return value
}

function sourceKind(value: string) {
  if (value === 'MANUAL' || value === 'INSTITUTION_DOCUMENT' || value === 'IMPORT') return value
  throw new Error('Unsupported source kind')
}

function timetableSlotKind(value: string) {
  if (value === 'LESSON' || value === 'CLASS_PRESENCE' || value === 'DISPOSITION' || value === 'RECEPTION' || value === 'OTHER') return value
  throw new Error('Unsupported timetable slot kind')
}


function compactClassLabel(grade: string, sectionCode: string) {
  const gradeValue = grade === 'PRIMA' ? '1' : grade === 'SECONDA' ? '2' : grade === 'TERZA' ? '3' : grade
  return `${gradeValue}${sectionCode.trim().toUpperCase()}`
}

function normalizeClassKey(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/PRIMA|1ª|1A(?=\s)/g, '1')
    .replace(/SECONDA|2ª|2A(?=\s)/g, '2')
    .replace(/TERZA|3ª|3A(?=\s)/g, '3')
    .replace(/[^A-Z0-9]/g, '')
}

function periodForOrdinal(startTime: string, durationMinutes: number, count: number, ordinal: number) {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > count) return null
  const [hours, minutes] = startTime.split(':').map(Number)
  const start = hours * 60 + minutes + (ordinal - 1) * durationMinutes
  const end = start + durationMinutes
  return {
    start: minutesToClock(start),
    end: minutesToClock(end),
  }
}

function minutesToClock(total: number) {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function presenceKind(value: string): TimetablePresenceKind {
  if (value === 'SUBSTITUTION' || value === 'CO_TEACHING' || value === 'SUPERVISION' || value === 'PROJECT' || value === 'OTHER') return value
  throw new Error('Unsupported presence kind')
}
