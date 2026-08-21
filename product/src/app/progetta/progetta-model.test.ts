import assert from 'node:assert/strict'
import test from 'node:test'
import type { KnowledgeAsset, KnowledgeDocument } from '@/core/domain/knowledge'
import { groupProgettaItems } from './progetta-model'

function item(id: string, contentCategory: KnowledgeAsset['contentCategory']) {
  return { asset: { id, contentCategory } as KnowledgeAsset, document: null as KnowledgeDocument | null }
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
