import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assetKindLabel,
  humanizeKnowledgeTitle,
  knowledgeProcessingStatus,
  sourceProviderLabel,
  unitTypeLabel,
} from './product-language'

test('technical knowledge statuses become teacher-facing statuses', () => {
  assert.equal(knowledgeProcessingStatus('INDEXED').label, 'Pronto')
  assert.equal(knowledgeProcessingStatus('FAILED').label, 'Da riprovare')
  assert.match(knowledgeProcessingStatus('FAILED').description, /originale resta conservato/i)
})

test('providers and asset kinds use professional language', () => {
  assert.equal(sourceProviderLabel('DRIVE'), 'Google Drive')
  assert.equal(sourceProviderLabel('MANUAL'), 'Inserito da te')
  assert.equal(assetKindLabel('GENERATED'), 'Creato in DOCENTE OS')
  assert.equal(unitTypeLabel('CHUNK'), 'Contenuto')
})

test('canonical and file-system titles are humanized without altering stored data', () => {
  assert.equal(
    humanizeKnowledgeTitle('CAN-PLAN-1_Piano_annuale_operativo_Tecnologia_Classe_1_2026-2027'),
    'Piano annuale operativo Tecnologia Classe 1 2026-2027',
  )
  assert.equal(humanizeKnowledgeTitle('programmazione_annuale.docx'), 'programmazione annuale')
  assert.equal(humanizeKnowledgeTitle(null), 'Contenuto senza titolo')
})
