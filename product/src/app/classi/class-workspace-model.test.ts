import assert from 'node:assert/strict'
import test from 'node:test'
import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'
import { buildClassWorkspaceLearningFocus, buildClassWorkspaceSummary, formatWeeklyMinutes } from './class-workspace-model'

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
  assert.equal(focus.materials[0]?.relevanceLabel, 'Fase corrente')
})

test('weekly minutes are presented in human form', () => {
  assert.equal(formatWeeklyMinutes(120), '2 h/settimana')
  assert.equal(formatWeeklyMinutes(90), '1 h 30 min/settimana')
})

function knowledgeItem(id: string, title: string, sourceMetadata: Record<string, unknown>, classLabels: string[] = []) {
  const asset: KnowledgeAsset = {
    id, workspaceId: 'w', academicYearId: 'y', assetKind: 'GENERATED', sourceProvider: 'SYSTEM', sourceLocator: null,
    originalName: title, originalText: null, mimeType: null, byteSize: null, sha256: null, processingStatus: 'INDEXED',
    sourceMetadata, currentGenerationId: `gen-${id}`, contentCategory: 'TEACHING_RESOURCE', disciplines: ['Tecnologia'], classLabels,
    contextStatus: 'REVIEWED', reliability: 'VERIFIED', capturedAt: `2026-08-2${id === 'pack' ? '2' : '1'}T10:00:00Z`, createdBy: 'u', createdAt: '', updatedAt: '',
  }
  const document: KnowledgeDocument = {
    id: `doc-${id}`, assetId: id, generationId: `gen-${id}`, workspaceId: 'w', title, documentType: 'TEACHING', language: 'it',
    normalizedText: null, normalizedMarkdown: null, summary: null, extractedData: {}, processingVersion: 'test@1', createdAt: '', updatedAt: '',
  }
  return { asset, document }
}
