import assert from 'node:assert/strict'
import test from 'node:test'
import { addTask, commaList, createTaskFromAsset, filterAssets, INITIAL_ASSETS, INITIAL_TASKS, toggleTask, updateAssetContext } from './demo-state'

test('aggiunge e completa una attività locale', () => {
  const added = addTask(INITIAL_TASKS, 'Preparare griglia di valutazione')
  assert.equal(added.length, INITIAL_TASKS.length + 1)
  assert.equal(toggleTask(added, added.at(-1)!.id).at(-1)!.completed, true)
})

test('filtra gli asset per categoria e contenuto', () => {
  assert.equal(filterAssets(INITIAL_ASSETS, 'Circolare', '').length, 1)
  assert.equal(filterAssets(INITIAL_ASSETS, 'Tutti', '2C').length, 2)
})

test('aggiorna il contesto senza modificare gli altri asset', () => {
  const updated = updateAssetContext(INITIAL_ASSETS, 'asset-3', { category: 'Circolare', context: 'Controllata', reliability: 'Verificata', disciplines: ['Tecnologia'], classLabels: ['1A'] })
  assert.equal(updated[2].context, 'Controllata')
  assert.equal(updated[0], INITIAL_ASSETS[0])
})

test('normalizza gli elenchi separati da virgole', () => {
  assert.deepEqual(commaList('Tecnologia, Educazione civica, Tecnologia'), ['Tecnologia', 'Educazione civica'])
})

test('crea una sola attività aperta collegata alla generazione dell’asset', () => {
  const created = createTaskFromAsset(INITIAL_TASKS, INITIAL_ASSETS[2])
  const linked = created.at(-1)!
  assert.equal(linked.sourceAssetId, 'asset-3')
  assert.equal(linked.sourceGeneration, 1)
  assert.equal(linked.priority, 'Alta')
  assert.equal(createTaskFromAsset(created, INITIAL_ASSETS[2]), created)
})
