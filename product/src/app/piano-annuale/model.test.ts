import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBlocks } from './model'

test('Prima follows the canonical B07-B15 alternation from CAN-PLAN-1', () => {
  const byId = new Map(buildBlocks('Prima').map((block) => [block.id, block]))
  const expected = [
    ['B07', '1-02', 'Riconoscere e classificare i materiali'],
    ['B08', '1-02', 'Proprietà e prove comparative'],
    ['B09', '1-02', 'Scegliere un materiale per una funzione'],
    ['B10', '1-02', 'Dalla risorsa al prodotto'],
    ['B11', '1-03', 'Entrare nel disegno tecnico'],
    ['B12', '1-03', 'Costruzioni fondamentali e controllo dell’errore'],
    ['B13', '1-02', 'Materiali, requisiti e micro-progetto trasversale'],
    ['B14', '1-02', 'Confronto, scelta e prova del micro-progetto'],
    ['B15', '1-03', 'Composizione geometrica e restituzione Open Day'],
  ] as const

  for (const [blockId, uda, title] of expected) {
    assert.equal(byId.get(blockId)?.uda, uda, `${blockId} UDA`)
    assert.equal(byId.get(blockId)?.title, title, `${blockId} title`)
  }
})

test('Prima preserves support packs without replacing the primary pack', () => {
  const byId = new Map(buildBlocks('Prima').map((block) => [block.id, block]))
  assert.equal(byId.get('B13')?.pack, 'CAN-PACK-1B')
  assert.deepEqual(byId.get('B13')?.supportPacks, ['CAN-PACK-1C'])
  assert.deepEqual(byId.get('B14')?.supportPacks, ['CAN-PACK-1C'])
  assert.equal(byId.get('B15')?.pack, 'CAN-PACK-1B')
  assert.deepEqual(byId.get('B15')?.supportPacks, ['CAN-PACK-1C', 'CAN-PACK-1D'])
})

test('all annual plans still contain 33 blocks and 66 hours', () => {
  for (const grade of ['Prima', 'Seconda', 'Terza'] as const) {
    const blocks = buildBlocks(grade)
    assert.equal(blocks.length, 33, grade)
    assert.equal(blocks.reduce((sum, block) => sum + block.hours, 0), 66, grade)
  }
})
