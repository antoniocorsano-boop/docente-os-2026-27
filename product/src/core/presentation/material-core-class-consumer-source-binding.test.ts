import assert from 'node:assert/strict'
import test from 'node:test'

import { buildClassroomSessionView } from '@/app/classi/[sectionId]/in-classe/[assetId]/classroom-session-model'
import { selectPreparedClassMaterials } from '@/app/classi/class-workspace-model'
import type { AnnualPlanSection } from '@/core/domain/annual-plan-execution'
import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'
import type { LessonDesignExtension } from '@/core/domain/lesson-design-extension'
import type { ClassMaterialAcceptanceEvidence } from './class-material-acceptance-projection'

const digest = {
  algorithm: 'SHA-256' as const,
  canonicalization: 'docente-os.material-content.v1' as const,
  value: 'a'.repeat(64),
}

const section: AnnualPlanSection = {
  id: 'section-2c',
  workspaceId: 'workspace-1',
  academicYearId: 'year-1',
  grade: 'SECONDA',
  sectionCode: 'C',
  status: 'CONFERMATA',
  sourceNote: null,
  confirmedAt: null,
  createdAt: '',
  updatedAt: '',
}

function materialAsset(): KnowledgeAsset {
  return {
    id: 'asset-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    assetKind: 'WEB',
    sourceProvider: 'MANUAL',
    sourceLocator: 'https://www.canva.com/d/material-1',
    originalName: 'Materiale energia',
    originalText: null,
    mimeType: null,
    byteSize: null,
    sha256: null,
    processingStatus: 'INDEXED',
    sourceMetadata: {
      docenteOsResource: 'CLASS_LESSON_MATERIAL',
      provider: 'CANVA',
      resourceKind: 'PRESENTATION',
      audience: 'STUDENT',
      approvalState: 'PENDING_HUMAN',
      targetDate: '2026-10-17',
      sectionId: 'section-2c',
      canonicalBinding: 'ALIGNED',
      canonicalBlockId: 'B01',
    },
    currentGenerationId: 'generation-1',
    contentCategory: 'TEACHING_RESOURCE',
    disciplines: ['Tecnologia'],
    classLabels: ['2C'],
    contextStatus: 'REVIEWED',
    reliability: 'VERIFIED',
    capturedAt: '2026-10-16T12:00:00Z',
    createdBy: 'teacher-1',
    createdAt: '',
    updatedAt: '',
  }
}

function acceptedExtension(): LessonDesignExtension {
  return {
    id: 'extension-1',
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    sectionId: 'section-2c',
    canonicalPlanAssetId: 'plan-1',
    canonicalGenerationId: 'plan-generation-1',
    blockId: 'B01',
    projectionId: 'projection-1',
    kind: 'TEACHER_RESOURCE',
    status: 'ACCEPTED',
    insertionPosition: 'END',
    anchorStepId: null,
    title: 'Materiale energia',
    body: 'Materiale canonico verificato.',
    cue: null,
    minutes: null,
    sourceKind: 'KNOWLEDGE',
    sourceRef: 'knowledge:asset-1',
    sourceLabel: 'Materiale energia',
    payload: {
      materialBinding: {
        schema: 'docente-os.lesson-material-binding.v1',
        role: 'LIM_VIEW',
        artifactKind: 'PRESENTATION',
        audience: 'STUDENT',
        materialRef: {
          kind: 'KNOWLEDGE_GENERATION',
          assetId: 'asset-1',
          generationId: 'generation-1',
          contentDigest: digest,
        },
        provenance: {
          sourceArtifactRefs: ['asset-1'],
          derivationRefs: [],
          evidenceRefs: ['teacher-acceptance-1'],
          rightsState: 'KNOWN',
          attributionRequirements: [],
        },
      },
    },
    revision: 1,
    decisionHistory: [{ action: 'ACCEPTED', actorId: 'teacher-1', at: '2026-10-16T12:00:00Z', revision: 1 }],
    modifiedBy: null,
    modifiedAt: null,
    acceptedBy: 'teacher-1',
    acceptedAt: '2026-10-16T12:00:00Z',
    dismissedBy: null,
    dismissedAt: null,
    createdBy: 'teacher-1',
    createdAt: '2026-10-16T11:59:00Z',
    updatedAt: '2026-10-16T12:00:00Z',
  }
}

function canonicalEvidence(): ClassMaterialAcceptanceEvidence {
  return {
    extensions: [acceptedExtension()],
    materialContentResolutions: {
      'extension-1': {
        status: 'READY',
        snapshot: {
          assetContent: { originalText: 'Energia', mimeType: 'text/plain', sourceSha256: null },
          document: {
            title: 'Materiale energia',
            documentType: 'TEACHING_RESOURCE',
            language: 'it',
            normalizedText: 'Energia',
            normalizedMarkdown: null,
            summary: null,
            extractedData: {},
          },
          units: [],
          referencedBinaryContent: [],
        },
        actualDigest: digest,
      },
    },
  }
}

test('class workspace shows Confermato only from canonical accepted READY evidence', () => {
  const asset = materialAsset()
  const document: KnowledgeDocument = {
    id: 'doc-1',
    assetId: asset.id,
    generationId: 'generation-1',
    workspaceId: asset.workspaceId,
    title: 'Materiale energia',
    documentType: 'TEACHING',
    language: 'it',
    normalizedText: null,
    normalizedMarkdown: null,
    summary: null,
    extractedData: {},
    processingVersion: 'test@1',
    createdAt: '',
    updatedAt: '',
  }

  const prepared = selectPreparedClassMaterials(
    section,
    [{ asset, document }],
    '2026-10-16',
    canonicalEvidence(),
  )

  assert.equal(prepared[0]?.stateLabel, 'Confermato')
})

test('in-class cockpit shows Confermato only from canonical accepted READY evidence', () => {
  const view = buildClassroomSessionView(section, materialAsset(), canonicalEvidence())

  assert.ok(view)
  assert.equal(view.approvalLabel, 'Confermato')
})
