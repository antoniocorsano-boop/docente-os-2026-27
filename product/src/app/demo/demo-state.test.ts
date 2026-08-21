import assert from 'node:assert/strict'
import test from 'node:test'
import { addTask, commaList, createTaskFromAsset, filterAssets, formatDueDate, INITIAL_ASSETS, INITIAL_TASKS, toggleTask, updateAssetContext, updateTask } from './demo-state'

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
  const created = createTaskFromAsset(INITIAL_TASKS, INITIAL_ASSETS[2], '2026-08-28')
  const linked = created.at(-1)!
  assert.equal(linked.sourceAssetId, 'asset-3')
  assert.equal(linked.sourceGeneration, 1)
  assert.equal(linked.priority, 'Alta')
  assert.equal(linked.dueDate, '2026-08-28')
  assert.equal(linked.schoolYear, '2026/27')
  assert.deepEqual(linked.classLabels, ['Tutte le classi'])
  assert.equal(linked.verificationStatus, 'Fonte da verificare')
  assert.equal(createTaskFromAsset(created, INITIAL_ASSETS[2]), created)
})

test('formatta la scadenza per il planner', () => {
  assert.equal(formatDueDate('2026-09-03'), '3 set')
  assert.equal(formatDueDate(''), 'Da pianificare')
})

test('aggiorna la scheda operativa senza alterare le altre attività', () => {
  const updated = updateTask(INITIAL_TASKS, 'task-1', { priority: 'Urgente', dueDate: '2026-09-01', completed: true })
  assert.equal(updated[0].priority, 'Urgente')
  assert.equal(updated[0].dueDate, '2026-09-01')
  assert.equal(updated[0].completed, true)
  assert.equal(updated[1], INITIAL_TASKS[1])
})
