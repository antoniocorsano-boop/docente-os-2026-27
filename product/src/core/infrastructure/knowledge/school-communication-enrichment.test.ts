import assert from 'node:assert/strict'
import test from 'node:test'
import type { NormalizedKnowledge } from '@/core/domain/knowledge'
import { SchoolCommunicationEnrichment } from './school-communication-enrichment'

function normalized(title: string, text: string): NormalizedKnowledge {
  return {
    title,
    documentType: 'GENERAL',
    language: 'it',
    text,
    markdown: text,
    summary: text.split(/\n/, 1)[0] ?? null,
    extractedData: {},
    units: [{ type: 'CHUNK', title, content: text, confidence: 1 }],
    processor: 'test-transformer',
    processorVersion: '1.0.0',
  }
}

test('una prova didattica conserva domande e opzioni senza trasformarle in azioni del docente', async () => {
  const text = [
    'PROVA 1 – FILA A',
    '',
    'A. Verificare le conoscenze',
    'Indica con una X la risposta giusta',
    'Con il metodo sperimentale, se l’ipotesi è confermata, lo scienziato',
    'può enunciare la legge',
    'deve osservare ancora il fenomeno',
    '',
    'B. Ricostruire le informazioni',
    'Fai gli abbinamenti giusti.',
    '',
    'C. Rispondere alle domande',
    'Che cosa deve fare uno scienziato nella fase di formulazione di un’ipotesi?',
    'Dai una definizione di tecnologia.',
    'Tecnologia',
  ].join('\n')

  const result = await new SchoolCommunicationEnrichment().enrich(normalized('documento-anonimo', text))
  const profile = result.extractedData?.schoolDocumentProfile as { suggestedCategory?: string } | undefined

  assert.equal(result.title, 'PROVA 1 – FILA A')
  assert.equal(result.documentType, 'TEACHING')
  assert.equal(profile?.suggestedCategory, 'ASSESSMENT')
  assert.equal(result.extractedData?.semanticMode, 'TEACHING_CONTENT')
  assert.equal(result.extractedData?.candidateCount, 0)
  assert.equal(result.units.filter((unit) => unit.type === 'ACTION' || unit.type === 'DEADLINE').length, 0)
  assert.match(result.units[0]?.content ?? '', /Che cosa deve fare uno scienziato/)
  assert.match(result.units[0]?.content ?? '', /deve osservare ancora il fenomeno/)
})

test('una vera circolare continua a proporre azioni e scadenze operative', async () => {
  const text = [
    'Circolare n. 12',
    'Istituto Comprensivo Statale “don Lorenzo Milani” — Calvario–Covotta',
    'Si invitano i docenti a compilare e restituire il modulo entro il 15 settembre 2026.',
  ].join('\n')

  const result = await new SchoolCommunicationEnrichment().enrich(normalized('Circolare n. 12', text))

  assert.equal(result.documentType, 'CIRCULAR')
  assert.equal(result.extractedData?.semanticMode, 'OPERATIONAL_COMMUNICATION')
  assert.equal(result.units.filter((unit) => unit.type === 'ACTION').length, 1)
  assert.equal(result.units.filter((unit) => unit.type === 'DEADLINE').length, 1)
  assert.equal(result.extractedData?.candidateCount, 2)
})
