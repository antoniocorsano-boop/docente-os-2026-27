import assert from 'node:assert/strict'
import test from 'node:test'
import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'
import { groupProgettaItems, planningCoverage } from './progetta-model'

function item(id: string, contentCategory: KnowledgeAsset['contentCategory']) {
  return { asset: { id, contentCategory, sourceMetadata: {} } as KnowledgeAsset, document: null as KnowledgeDocument | null }
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
