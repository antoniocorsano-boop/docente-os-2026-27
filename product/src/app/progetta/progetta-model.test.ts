import assert from 'node:assert/strict'
import test from 'node:test'
import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'
import {
  asProgettaFocus,
  asProgettaGrade,
  filterProgettaItemsByFocus,
  filterProgettaItemsByGrade,
  filterProgettaItemsBySectionContext,
  groupProgettaItems,
  partitionProgettaFocusBySection,
  planningCoverage,
} from './progetta-model'

function item(id: string, contentCategory: KnowledgeAsset['contentCategory']) {
  const asset: KnowledgeAsset = {
    id,
    workspaceId: 'w',
    academicYearId: 'y',
    assetKind: 'GENERATED',
    sourceProvider: 'SYSTEM',
    sourceLocator: null,
    originalName: null,
    originalText: null,
    mimeType: null,
    byteSize: null,
    sha256: null,
    processingStatus: 'INDEXED',
    sourceMetadata: {},
    currentGenerationId: null,
    contentCategory,
    disciplines: [],
    classLabels: [],
    contextStatus: 'REVIEWED',
    reliability: 'VERIFIED',
    capturedAt: '2026-08-22T10:00:00Z',
    createdBy: 'u',
    createdAt: '',
    updatedAt: '',
  }
  return { asset, document: null as KnowledgeDocument | null }
}

test('organizza gli asset nelle tre aree di progettazione', () => {
  const groups = groupProgettaItems([
    item('p', 'PROGRAMMING'), item('u', 'UDA'), item('r', 'TEACHING_RESOURCE'),
    item('m', 'MODEL'), item('v', 'ASSESSMENT'), item('c', 'CIRCULAR'),
  ])

  assert.deepEqual(groups.map((group) => [group.key, group.items.map(({ asset }) => asset.id)]), [
    ['programming', ['p']],
    ['uda', ['u']],
    ['materials', ['r', 'm', 'v']],
  ])
})

test('rende esplicita la copertura per classe senza inventare UDA mancanti', () => {
  const prima = { asset: { ...item('p1', 'PROGRAMMING').asset, sourceMetadata: { grade: 'prima' } }, document: null }
  const seconda = { asset: { ...item('p2', 'PROGRAMMING').asset, sourceMetadata: { grade: 'seconda' } }, document: null }
  const uda = { asset: { ...item('u1', 'UDA').asset, sourceMetadata: { grade: 'prima' } }, document: null }
  const material = { asset: { ...item('r1', 'TEACHING_RESOURCE').asset, sourceMetadata: { grade: 'prima' } }, document: null }

  assert.deepEqual(planningCoverage([prima, seconda, uda, material]), [
    { grade: 'prima', programming: 1, uda: 1, materials: 1 },
    { grade: 'seconda', programming: 1, uda: 0, materials: 0 },
    { grade: 'terza', programming: 0, uda: 0, materials: 0 },
  ])
})

test('filtra Progetta per grado mantenendo i contenuti comuni', () => {
  const prima = { asset: { ...item('p1', 'PROGRAMMING').asset, sourceMetadata: { grade: 'prima' } }, document: null }
  const seconda = { asset: { ...item('p2', 'PROGRAMMING').asset, sourceMetadata: { grade: 'seconda' } }, document: null }
  const comune = item('shared', 'TEACHING_RESOURCE')

  assert.deepEqual(filterProgettaItemsByGrade([prima, seconda, comune], 'seconda').map(({ asset }) => asset.id), ['p2', 'shared'])
  assert.equal(asProgettaGrade('seconda'), 'seconda')
  assert.equal(asProgettaGrade('quarta'), null)
})

test('mantiene il nucleo comune e la sola variante della sezione corrente', () => {
  const comune = item('shared', 'TEACHING_RESOURCE')
  const secondaC = { asset: { ...item('2c', 'TEACHING_RESOURCE').asset, classLabels: ['2C'] }, document: null }
  const secondaA = { asset: { ...item('2a', 'TEACHING_RESOURCE').asset, classLabels: ['2A'] }, document: null }

  assert.deepEqual(
    filterProgettaItemsBySectionContext([comune, secondaC, secondaA], '2C').map(({ asset }) => asset.id),
    ['shared', '2c'],
  )
})

test('riconosce il focus blocco UDA pacchetto e separa nucleo comune da adattamento di sezione', () => {
  const focus = asProgettaFocus({ block: 'b22', uda: '2-07', pack: 'can-pack-2g' })
  assert.deepEqual(focus, { blockId: 'B22', uda: '2-07', pack: 'CAN-PACK-2G' })

  const core = {
    asset: { ...item('core', 'UDA').asset, originalName: 'CAN-PACK-2G UDA 2-07' },
    document: null,
  }
  const section = {
    asset: { ...item('section', 'TEACHING_RESOURCE').asset, sourceMetadata: { pack: 'CAN-PACK-2G' }, classLabels: ['2C'] },
    document: null,
  }
  const other = {
    asset: { ...item('other', 'UDA').asset, originalName: 'CAN-PACK-2F UDA 2-05' },
    document: null,
  }

  const focused = filterProgettaItemsByFocus([core, section, other], focus)
  assert.deepEqual(focused.map(({ asset }) => asset.id), ['core', 'section'])
  assert.deepEqual(partitionProgettaFocusBySection(focused, '2C'), { core: [core], section: [section] })
  assert.equal(asProgettaFocus({ block: '22', uda: 'foo', pack: '2G' }), null)
})
