import assert from 'node:assert/strict'
import test from 'node:test'
import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'
import { buildClassWorkspaceLearningFocus, buildClassWorkspaceSummary, formatWeeklyMinutes, humanMaterialTitle, selectPreparedClassMaterials } from './class-workspace-model'

const section2C = {
  id: 'section-2c', workspaceId: 'w', academicYearId: 'y', grade: 'SECONDA' as const, sectionCode: 'C',
  status: 'CONFERMATA' as const, sourceNote: null, confirmedAt: null, createdAt: '', updatedAt: '',
}

test('builds class workspace from canonical section, assignment and progress', () => {
  const summary = buildClassWorkspaceSummary(
    section2C,
    [{
      id: 'a1', workspaceId: 'w', academicYearId: 'y', sectionId: 'section-2c', disciplineId: 'd1',
      weeklyMinutes: 120, status: 'CONFIRMED', sourceNote: null, createdAt: '', updatedAt: '',
    }],
    [{ id: 'd1', workspaceId: 'w', academicYearId: 'y', name: 'Tecnologia', isActive: true, createdBy: 'u', createdAt: '', updatedAt: '' }],
    [
      { id: 'p1', sectionId: 'section-2c', canonicalPlanAssetId: 'asset', canonicalGenerationId: 'gen', blockId: 'B01', status: 'SVOLTO', executedOn: null, evidenceNote: null, updatedAt: '' },
      { id: 'p2', sectionId: 'section-2c', canonicalPlanAssetId: 'asset', canonicalGenerationId: 'gen', blockId: 'B02', status: 'PIANIFICATO', executedOn: null, evidenceNote: null, updatedAt: '' },
    ],
  )

  assert.equal(summary.displayLabel, '2ª C')
  assert.equal(summary.compactLabel, '2C')
  assert.equal(summary.gradeQuery, 'seconda')
  assert.equal(summary.assignments[0]?.discipline, 'Tecnologia')
  assert.equal(summary.completedBlocks, 1)
  assert.equal(summary.sectionStatusLabel, 'Confermata')
})

test('projects the next canonical block and only explicitly pertinent materials', () => {
  const focus = buildClassWorkspaceLearningFocus(
    section2C,
    [
      { id: 'p1', sectionId: 'section-2c', canonicalPlanAssetId: '36ef3be5-925f-4e28-afff-df11097827a9', canonicalGenerationId: 'a1066c0a-2720-40b0-841e-306cb998ce3e', blockId: 'B01', status: 'SVOLTO', executedOn: null, evidenceNote: null, updatedAt: '' },
      { id: 'p2', sectionId: 'section-2c', canonicalPlanAssetId: '36ef3be5-925f-4e28-afff-df11097827a9', canonicalGenerationId: 'a1066c0a-2720-40b0-841e-306cb998ce3e', blockId: 'B02', status: 'PIANIFICATO', executedOn: null, evidenceNote: null, updatedAt: '' },
    ],
    [
      knowledgeItem('pack', 'Scheda operativa CAN-PACK-2A', { grade: 'seconda' }),
      knowledgeItem('class', 'Materiale specifico 2C', {}, ['2C']),
      knowledgeItem('other', 'Materiale prima', { grade: 'prima' }),
    ],
  )

  assert.equal(focus.completedBlocks, 1)
  assert.equal(focus.nextBlock?.id, 'B02')
  assert.equal(focus.nextBlock?.pack, 'CAN-PACK-2A')
  assert.equal(focus.nextBlock?.statusLabel, 'Pianificato')
  assert.deepEqual(focus.materials.map((item) => item.assetId), ['pack', 'class'])
  assert.equal(focus.materials[0]?.title, 'Scheda operativa')
  assert.equal(focus.materials[0]?.relevanceLabel, 'Fase corrente')
})

test('prepared class material is selected by exact class and nearest teaching date without inventing a CAN-PLAN binding', () => {
  const prepared = selectPreparedClassMaterials(
    section2C,
    [
      knowledgeItem('old', 'Presentazione precedente', {
        docenteOsResource: 'CLASS_LESSON_MATERIAL', provider: 'CANVA', resourceKind: 'PRESENTATION', audience: 'STUDENT',
        approvalState: 'APPROVED', targetDate: '2026-09-08', canonicalBinding: 'PRE_CANONICAL_DIAGNOSTIC',
      }, ['2C'], 'https://www.canva.com/d/old'),
      knowledgeItem('next', 'Presentazione accoglienza 2C', {
        docenteOsResource: 'CLASS_LESSON_MATERIAL', provider: 'CANVA', resourceKind: 'PRESENTATION', audience: 'STUDENT',
        approvalState: 'PENDING_HUMAN', targetDate: '2026-09-14', canonicalBinding: 'PRE_CANONICAL_DIAGNOSTIC',
      }, ['2C'], 'https://www.canva.com/d/next'),
      knowledgeItem('other-class', 'Presentazione 2A', {
        docenteOsResource: 'CLASS_LESSON_MATERIAL', provider: 'CANVA', resourceKind: 'PRESENTATION', audience: 'STUDENT',
        approvalState: 'PENDING_HUMAN', targetDate: '2026-09-14', canonicalBinding: 'PRE_CANONICAL_DIAGNOSTIC',
      }, ['2A'], 'https://www.canva.com/d/other'),
      knowledgeItem('unsafe', 'Risorsa non sicura', {
        docenteOsResource: 'CLASS_LESSON_MATERIAL', provider: 'CANVA', resourceKind: 'PRESENTATION', audience: 'STUDENT',
        approvalState: 'PENDING_HUMAN', targetDate: '2026-09-14', canonicalBinding: 'PRE_CANONICAL_DIAGNOSTIC',
      }, ['2C'], 'javascript:alert(1)'),
    ],
    '2026-09-10',
  )

  assert.equal(prepared.length, 1)
  assert.equal(prepared[0]?.assetId, 'next')
  assert.equal(prepared[0]?.href, 'https://www.canva.com/d/next')
  assert.equal(prepared[0]?.providerLabel, 'Canva')
  assert.equal(prepared[0]?.resourceKindLabel, 'Presentazione')
  assert.equal(prepared[0]?.audienceLabel, 'Per la classe')
  assert.equal(prepared[0]?.stateLabel, 'Predisposto')
  assert.equal(prepared[0]?.canonicalBindingLabel, 'Diagnostica di accoglienza · non imputata al Piano')
})

test('prepared materials receive priority in the generic material list without changing their canonical meaning', () => {
  const focus = buildClassWorkspaceLearningFocus(
    section2C,
    [],
    [
      knowledgeItem('generic', 'Materiale 2C', {}, ['2C']),
      knowledgeItem('prepared', 'Presentazione per la classe', {
        docenteOsResource: 'CLASS_LESSON_MATERIAL', provider: 'CANVA', resourceKind: 'PRESENTATION', audience: 'STUDENT',
        approvalState: 'PENDING_HUMAN', targetDate: '2026-09-14', canonicalBinding: 'PRE_CANONICAL_DIAGNOSTIC',
      }, ['2C'], 'https://www.canva.com/d/prepared'),
    ],
  )

  assert.equal(focus.materials[0]?.assetId, 'prepared')
})

test('technical document identifiers are removed from human material titles', () => {
  assert.equal(humanMaterialTitle('CAN-UDA-1-00 — Entrare_nel_laboratorio'), 'Entrare nel laboratorio')
  assert.equal(humanMaterialTitle('CAN-PACK-1A_Avvio_classe_prima'), 'Avvio classe prima')
  assert.equal(humanMaterialTitle('Scheda operativa CAN-PACK-2A'), 'Scheda operativa')
})

test('weekly minutes are presented in human form', () => {
  assert.equal(formatWeeklyMinutes(120), '2 h/settimana')
  assert.equal(formatWeeklyMinutes(90), '1 h 30 min/settimana')
})

function knowledgeItem(
  id: string,
  title: string,
  sourceMetadata: Record<string, unknown>,
  classLabels: string[] = [],
  sourceLocator: string | null = null,
) {
  const asset: KnowledgeAsset = {
    id, workspaceId: 'w', academicYearId: 'y', assetKind: sourceLocator ? 'WEB' : 'GENERATED', sourceProvider: sourceLocator ? 'MANUAL' : 'SYSTEM', sourceLocator,
    originalName: title, originalText: null, mimeType: null, byteSize: null, sha256: null, processingStatus: 'INDEXED',
    sourceMetadata, currentGenerationId: `gen-${id}`, contentCategory: 'TEACHING_RESOURCE', disciplines: ['Tecnologia'], classLabels,
    contextStatus: 'REVIEWED', reliability: 'VERIFIED', capturedAt: `2026-09-${id === 'old' ? '08' : '10'}T10:00:00Z`, createdBy: 'u', createdAt: '', updatedAt: '',
  }
  const document: KnowledgeDocument = {
    id: `doc-${id}`, assetId: id, generationId: `gen-${id}`, workspaceId: 'w', title, documentType: 'TEACHING', language: 'it',
    normalizedText: null, normalizedMarkdown: null, summary: null, extractedData: {}, processingVersion: 'test@1', createdAt: '', updatedAt: '',
  }
  return { asset, document }
}
