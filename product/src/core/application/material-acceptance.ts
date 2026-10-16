import type { LessonDesignExtension, LessonDesignExtensionDraft } from '@/core/domain/lesson-design-extension'
import {
  parseLessonMaterialBindingV1,
  type LessonMaterialBindingV1,
} from '@/core/domain/lesson-material-binding'
import {
  resolveCanonicalMaterialContentV1,
  type MaterialContentReadPortV1,
} from './material-content-resolution'

export type MaterialAcceptanceAuthorityContext = {
  actorId: string
  workspaceId: string
  academicYearId: string
  sectionId: string
  canonicalPlanAssetId: string
  canonicalGenerationId: string
  blockId: string
  projectionId: string
}

export interface MaterialAcceptanceAuthorityPort {
  resolve(input: {
    sectionId: string
    blockId: string
  }): Promise<MaterialAcceptanceAuthorityContext | null>
}

export interface MaterialAcceptanceLessonDesignPort {
  list(context: MaterialAcceptanceAuthorityContext): Promise<LessonDesignExtension[]>
  addToolProposalOnce(
    context: MaterialAcceptanceAuthorityContext,
    input: LessonDesignExtensionDraft,
    dedupeKey: string,
  ): Promise<LessonDesignExtension>
  accept(context: MaterialAcceptanceAuthorityContext, extensionId: string): Promise<void>
}

export type AcceptLessonMaterialProposalCommand = {
  sectionId: string
  blockId: string
  binding: unknown
  idempotencyKey: string
  title: string
  body: string
}

export async function acceptLessonMaterialProposal(
  input: AcceptLessonMaterialProposalCommand,
  dependencies: {
    authority: MaterialAcceptanceAuthorityPort
    content: MaterialContentReadPortV1
    lessonDesign: MaterialAcceptanceLessonDesignPort
  },
): Promise<LessonDesignExtension> {
  const binding = parseLessonMaterialBindingV1(input.binding)
  const idempotencyKey = requireNonEmpty(input.idempotencyKey, 'Material acceptance idempotency key')
  const title = requireNonEmpty(input.title, 'Material acceptance title')
  const body = requireNonEmpty(input.body, 'Material acceptance body')

  const authority = await dependencies.authority.resolve({
    sectionId: input.sectionId,
    blockId: input.blockId,
  })
  if (!authority) throw new Error('Authorized material acceptance context is required')
  assertActiveLessonContext(authority, input)

  const resolution = await resolveCanonicalMaterialContentV1({
    workspaceId: authority.workspaceId,
    ref: binding.materialRef,
    readPort: dependencies.content,
  })
  if (resolution.status !== 'READY') {
    if (resolution.status === 'STALE') {
      throw new Error('Material content digest is stale or does not match canonical content')
    }
    throw new Error(`Material content is not acceptable: ${resolution.reason}`)
  }

  const existing = matchingIdempotencyExtension(
    await dependencies.lessonDesign.list(authority),
    idempotencyKey,
  )
  if (existing) {
    assertSameSemanticAcceptance(existing, { binding, title, body, idempotencyKey })
    if (existing.status === 'ACCEPTED') return existing
    if (existing.status === 'DISMISSED') throw new Error('Material acceptance idempotency conflict')

    await dependencies.lessonDesign.accept(authority, existing.id)
    return requireAcceptedReadBack(
      await dependencies.lessonDesign.list(authority),
      existing.id,
    )
  }

  const draft = buildMaterialExtensionDraft(authority, binding, {
    idempotencyKey,
    title,
    body,
  })
  const proposal = await dependencies.lessonDesign.addToolProposalOnce(
    authority,
    draft,
    idempotencyKey,
  )

  assertExtensionContext(proposal, authority)
  assertSameSemanticAcceptance(proposal, { binding, title, body, idempotencyKey })

  if (proposal.status === 'ACCEPTED') return proposal
  if (proposal.status === 'DISMISSED') throw new Error('Material acceptance idempotency conflict')

  await dependencies.lessonDesign.accept(authority, proposal.id)
  return requireAcceptedReadBack(
    await dependencies.lessonDesign.list(authority),
    proposal.id,
  )
}

function buildMaterialExtensionDraft(
  context: MaterialAcceptanceAuthorityContext,
  binding: LessonMaterialBindingV1,
  input: { idempotencyKey: string; title: string; body: string },
): LessonDesignExtensionDraft {
  return {
    sectionId: context.sectionId,
    canonicalPlanAssetId: context.canonicalPlanAssetId,
    canonicalGenerationId: context.canonicalGenerationId,
    blockId: context.blockId,
    projectionId: context.projectionId,
    kind: binding.audience === 'STUDENT' ? 'STUDENT_RESOURCE' : 'TEACHER_RESOURCE',
    insertionPosition: 'END',
    anchorStepId: null,
    title: input.title,
    body: input.body,
    cue: null,
    minutes: null,
    sourceKind: 'KNOWLEDGE',
    sourceRef: materialSourceRef(binding),
    sourceLabel: input.title,
    payload: {
      dedupeKey: input.idempotencyKey,
      materialBinding: binding,
    },
  }
}

function materialSourceRef(binding: LessonMaterialBindingV1) {
  if (binding.materialRef.kind === 'KNOWLEDGE_GENERATION') {
    return `knowledge:${binding.materialRef.assetId}:${binding.materialRef.generationId}`
  }
  return `knowledge:${binding.materialRef.assetId}:revision:${binding.materialRef.revisionRef}`
}

function matchingIdempotencyExtension(
  extensions: LessonDesignExtension[],
  idempotencyKey: string,
) {
  return extensions.find((extension) => extension.payload.dedupeKey === idempotencyKey) ?? null
}

function assertSameSemanticAcceptance(
  extension: LessonDesignExtension,
  expected: {
    binding: LessonMaterialBindingV1
    title: string
    body: string
    idempotencyKey: string
  },
) {
  if (extension.payload.dedupeKey !== expected.idempotencyKey) {
    throw new Error('Material acceptance idempotency conflict')
  }

  let storedBinding: LessonMaterialBindingV1
  try {
    storedBinding = parseLessonMaterialBindingV1(extension.payload.materialBinding)
  } catch {
    throw new Error('Material acceptance idempotency conflict')
  }

  if (
    canonicalSerialize(storedBinding) !== canonicalSerialize(expected.binding)
    || extension.title.trim() !== expected.title
    || extension.body.trim() !== expected.body
  ) {
    throw new Error('Material acceptance idempotency conflict')
  }
}

function assertActiveLessonContext(
  context: MaterialAcceptanceAuthorityContext,
  input: Pick<AcceptLessonMaterialProposalCommand, 'sectionId' | 'blockId'>,
) {
  if (context.sectionId !== input.sectionId || context.blockId !== input.blockId) {
    throw new Error('Material acceptance is outside the active lesson context')
  }
  for (const [label, value] of [
    ['actor', context.actorId],
    ['workspace', context.workspaceId],
    ['academic year', context.academicYearId],
    ['canonical plan asset', context.canonicalPlanAssetId],
    ['canonical generation', context.canonicalGenerationId],
    ['projection', context.projectionId],
  ] as const) {
    if (!value.trim()) throw new Error(`Material acceptance active lesson context is missing ${label}`)
  }
}

function assertExtensionContext(
  extension: LessonDesignExtension,
  context: MaterialAcceptanceAuthorityContext,
) {
  if (
    extension.workspaceId !== context.workspaceId
    || extension.academicYearId !== context.academicYearId
    || extension.sectionId !== context.sectionId
    || extension.canonicalPlanAssetId !== context.canonicalPlanAssetId
    || extension.canonicalGenerationId !== context.canonicalGenerationId
    || extension.blockId !== context.blockId
    || extension.projectionId !== context.projectionId
  ) {
    throw new Error('Material acceptance proposal is outside the active lesson context')
  }
}

function requireAcceptedReadBack(
  extensions: LessonDesignExtension[],
  extensionId: string,
) {
  const accepted = extensions.find(
    (extension) => extension.id === extensionId && extension.status === 'ACCEPTED',
  )
  if (!accepted) throw new Error('Material acceptance canonical read-back failed')
  return accepted
}

function canonicalSerialize(value: unknown) {
  return JSON.stringify(canonicalize(value))
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value
  const record = value as Record<string, unknown>
  return Object.fromEntries(
    Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => [key, canonicalize(record[key])]),
  )
}

function requireNonEmpty(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${label} is required`)
  return normalized
}
