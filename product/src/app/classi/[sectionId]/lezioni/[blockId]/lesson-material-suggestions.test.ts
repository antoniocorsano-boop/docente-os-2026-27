import assert from 'node:assert/strict'
import test from 'node:test'
import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'
import { buildLessonMaterialSuggestions, textbookMaterialId } from './lesson-material-suggestions'

function item(input: {
  id: string
  title: string
  summary?: string
  category?: KnowledgeAsset['contentCategory']
  sourceMetadata?: Record<string, unknown>
  classLabels?: string[]
}) {
  const asset: KnowledgeAsset = {
    id: input.id,
    workspaceId: 'w',
    academicYearId: 'y',
    assetKind: 'FILE',
    sourceProvider: 'UPLOAD',
    sourceLocator: null,
    originalName: input.title,
    originalText: null,
    mimeType: 'application/pdf',
    byteSize: null,
    sha256: null,
    processingStatus: 'INDEXED',
    sourceMetadata: input.sourceMetadata ?? {},
    currentGenerationId: null,
    contentCategory: input.category ?? 'TEACHING_RESOURCE',
    disciplines: ['Tecnologia'],
    classLabels: input.classLabels ?? [],
    contextStatus: 'REVIEWED',
    reliability: 'VERIFIED',
    capturedAt: '2026-09-08T10:00:00Z',
    createdBy: 'u',
    createdAt: '',
    updatedAt: '',
  }
  const document: KnowledgeDocument = {
    id: `doc-${input.id}`,
    assetId: input.id,
    generationId: 'g',
    workspaceId: 'w',
    title: input.title,
    documentType: 'TEACHING',
    language: 'it',
    normalizedText: null,
    normalizedMarkdown: null,
    summary: input.summary ?? null,
    extractedData: {},
    processingVersion: '1',
    createdAt: '',
    updatedAt: '',
  }
  return { asset, document }
}

const base = {
  grade: 'seconda' as const,
  compactSectionLabel: '2C',
  blockId: 'B12',
  uda: '2-04',
  pack: 'CAN-PACK-2D',
  lessonTitle: 'Materiali e proprietà',
  objective: 'Riconoscere proprietà e impieghi dei materiali',
  excludedAssetIds: new Set<string>(),
}

test('propone un materiale editoriale del libro confermato anche senza tag B/UDA/PACK', () => {
  const editorial = item({
    id: 'editorial',
    title: 'Verifiche sui materiali',
    summary: 'Prove modificabili sulle proprietà dei materiali.',
    category: 'ASSESSMENT',
    sourceMetadata: {
      materialRole: 'TEXTBOOK_TEACHER_MATERIAL',
      textbook: { id: 'book-1', title: 'Tecnologia.verde 2ed' },
    },
  })

  const result = buildLessonMaterialSuggestions({
    ...base,
    items: [editorial],
    confirmedTextbooks: [{ id: 'book-1', title: 'Tecnologia.verde 2ed' }],
  })

  assert.equal(result.length, 1)
  assert.equal(result[0]?.sourceKind, 'EDITORIAL_KNOWLEDGE')
  assert.equal(result[0]?.textbookId, 'book-1')
  assert.match(result[0]?.reason ?? '', /libro confermato/i)
  assert.match(result[0]?.usageTip ?? '', /verifica rapida/i)
  assert.deepEqual(result[0]?.pedagogicalRoles, ['ASSESSMENT'])
  assert.equal(result[0]?.classificationConfidence, 'HIGH')
})

test('propone Idee per insegnare alla 2C quando il riferimento è generale alla secondaria e il libro è confermato', () => {
  const guide = item({
    id: 'idee-per-insegnare',
    title: 'Idee per insegnare',
    summary: 'Programmazione per competenze, obiettivi minimi e prove di verifica di Tecnologia.',
    classLabels: ['Secondaria di primo grado'],
    sourceMetadata: {
      materialRole: 'TEXTBOOK_TEACHER_MATERIAL',
      textbook: { id: 'book-1', title: 'Tecnologia.verde 2ed' },
    },
  })
  const otherSection = item({
    id: 'solo-2a',
    title: 'Adattamento 2A',
    classLabels: ['2A'],
    sourceMetadata: {
      materialRole: 'TEXTBOOK_TEACHER_MATERIAL',
      textbook: { id: 'book-1', title: 'Tecnologia.verde 2ed' },
    },
  })

  const result = buildLessonMaterialSuggestions({
    ...base,
    items: [guide, otherSection],
    confirmedTextbooks: [{ id: 'book-1', title: 'Tecnologia.verde 2ed' }],
  })

  assert.deepEqual(result.map((suggestion) => suggestion.assetId), ['idee-per-insegnare'])
  assert.equal(result[0]?.sourceKind, 'EDITORIAL_KNOWLEDGE')
  assert.match(result[0]?.reason ?? '', /libro confermato/i)
  assert.ok(result[0]?.pedagogicalRoles.includes('PLANNING_SUPPORT'))
  assert.ok(result[0]?.pedagogicalRoles.includes('ASSESSMENT'))
})

test('distingue la verifica ad alta leggibilità come verifica inclusiva', () => {
  const accessible = item({
    id: 'accessible',
    title: 'Prova di verifica ad alta leggibilità',
    summary: 'Prova sui materiali con impaginazione facilitata.',
    category: 'ASSESSMENT',
    sourceMetadata: {
      materialRole: 'TEXTBOOK_TEACHER_MATERIAL',
      textbook: { id: 'book-1', title: 'Tecnologia.verde 2ed' },
    },
  })

  const result = buildLessonMaterialSuggestions({
    ...base,
    items: [accessible],
    confirmedTextbooks: [{ id: 'book-1', title: 'Tecnologia.verde 2ed' }],
  })

  assert.deepEqual(result[0]?.pedagogicalRoles.slice(0, 2), ['INCLUSION', 'ASSESSMENT'])
  assert.match(result[0]?.usageTip ?? '', /alta leggibilità/i)
})

test('riconosce una lezione PowerPoint come spiegazione e supporto visivo', () => {
  const slides = item({
    id: 'slides',
    title: 'Lezione PowerPoint sui materiali',
    summary: 'Presentazione visuale sulle proprietà dei materiali.',
    category: 'TEACHING_RESOURCE',
    sourceMetadata: {
      materialRole: 'TEXTBOOK_TEACHER_MATERIAL',
      textbook: { id: 'book-1', title: 'Tecnologia.verde 2ed' },
    },
  })

  const result = buildLessonMaterialSuggestions({
    ...base,
    items: [slides],
    confirmedTextbooks: [{ id: 'book-1', title: 'Tecnologia.verde 2ed' }],
  })

  assert.deepEqual(result[0]?.pedagogicalRoles, ['EXPLANATION', 'VISUAL_SUPPORT'])
  assert.match(result[0]?.usageTip ?? '', /supporto visivo/i)
})

test('non propone materiale editoriale di un libro non confermato per la classe', () => {
  const editorial = item({
    id: 'other-book',
    title: 'Guida docente',
    sourceMetadata: {
      materialRole: 'TEXTBOOK_TEACHER_MATERIAL',
      textbook: { id: 'book-2', title: 'Altro libro' },
    },
  })

  const result = buildLessonMaterialSuggestions({
    ...base,
    items: [editorial],
    confirmedTextbooks: [{ id: 'book-1', title: 'Tecnologia.verde 2ed' }],
  })

  assert.deepEqual(result, [])
})

test('mantiene i materiali già collegati esplicitamente al focus anche se non editoriali', () => {
  const focused = item({
    id: 'focused',
    title: 'Scheda B12',
    summary: 'Attività operativa CAN-PACK-2D.',
    sourceMetadata: { block: 'B12' },
  })

  const result = buildLessonMaterialSuggestions({
    ...base,
    items: [focused],
    confirmedTextbooks: [],
  })

  assert.equal(result.length, 1)
  assert.equal(result[0]?.sourceKind, 'KNOWLEDGE')
  assert.match(result[0]?.reason ?? '', /B12/)
})

test('esclude i materiali già allegati alla lezione', () => {
  const focused = item({ id: 'already-used', title: 'Scheda B12', sourceMetadata: { block: 'B12' } })
  const result = buildLessonMaterialSuggestions({
    ...base,
    items: [focused],
    excludedAssetIds: new Set(['already-used']),
    confirmedTextbooks: [],
  })
  assert.deepEqual(result, [])
})

test('riconosce il textbookId solo nel metadato editoriale previsto', () => {
  assert.equal(textbookMaterialId({ materialRole: 'TEXTBOOK_TEACHER_MATERIAL', textbook: { id: ' book-1 ' } }), 'book-1')
  assert.equal(textbookMaterialId({ textbook: { id: 'book-1' } }), null)
  assert.equal(textbookMaterialId({ materialRole: 'TEXTBOOK_TEACHER_MATERIAL', textbook: 'book-1' }), null)
})
