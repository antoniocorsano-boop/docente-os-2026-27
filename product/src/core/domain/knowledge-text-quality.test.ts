import assert from 'node:assert/strict'
import test from 'node:test'
import { chunkKnowledgeText } from '@/core/infrastructure/knowledge/plain-text-transformer'
import {
  isKnowledgeHighlightNoise,
  isLocalPdfTextDerivativeFilename,
  meaningfulKnowledgeSummary,
  normalizeKnowledgeWorkingText,
} from './knowledge-text-quality'

test('recognizes only the canonical local PDF text derivative filename', () => {
  assert.equal(isLocalPdfTextDerivativeFilename('Idee per insegnare-anonimizzato.txt'), true)
  assert.equal(isLocalPdfTextDerivativeFilename('nota-anonimizzata.txt'), false)
  assert.equal(isLocalPdfTextDerivativeFilename('guida.pdf'), false)
})

test('removes repeated teacher-guide boilerplate while preserving didactic content', () => {
  const source = [
    '30',
    'LE MATERIE PRIME E I MATERIALI',
    'Rossi, Bianchi, TECNOLOGIA.VERDE,',
    'Seconda edizione © Editore 2024',
    'Questa pagina è riservata a chi insegna e non può essere riprodotta con alcun mezzo o',
    'comunque messa a disposizione del pubblico',
    'fini esclusivi di attività didattica.',
    'NOME ........................ COGNOME ........................ CLASSE ........ DATA ........',
    'PROVA A1 – FILA A',
    'Indica con una X la risposta giusta.',
    '1. Il peso specifico di un materiale è una proprietà fisica.',
    "Copia riservata all'insegnante [dato di contatto rimosso]",
  ].join('\n')

  const result = normalizeKnowledgeWorkingText(source, { localPdfTextDerivative: true })

  assert.ok(result.removedBoilerplateLines >= 7)
  assert.doesNotMatch(result.text, /Questa pagina è riservata/i)
  assert.doesNotMatch(result.text, /NOME \.{4,}/i)
  assert.doesNotMatch(result.text, /© Editore 2024/i)
  assert.match(result.text, /LE MATERIE PRIME E I MATERIALI/)
  assert.match(result.text, /PROVA A1 – FILA A/)
  assert.match(result.text, /peso specifico/i)
})

test('removes publisher legal block and standalone empty form labels found in real teacher guides', () => {
  const source = [
    'Questo libro è stampato su carta certificata',
    'Stampa: Tipografia Demo',
    '[dato di contatto rimosso], 40100 Bologna',
    'per conto di Demo Editore S.p.A.',
    'Copyright © 2024 Demo Editore S.p.A.',
    'www.demo-editore.example',
    'Diritti riservati',
    'I diritti di pubblicazione, riproduzione, comunicazione e distribuzione sono riservati.',
    'nome:',
    'PROVA C2 – FILA A',
    'Indica con una X la risposta giusta.',
  ].join('\n')

  const result = normalizeKnowledgeWorkingText(source, { localPdfTextDerivative: true })

  assert.doesNotMatch(result.text, /Copyright/i)
  assert.doesNotMatch(result.text, /Diritti riservati/i)
  assert.doesNotMatch(result.text, /www\.demo-editore\.example/i)
  assert.doesNotMatch(result.text, /^nome:\s*$/im)
  assert.doesNotMatch(result.text, /Stampa: Tipografia Demo/i)
  assert.match(result.text, /PROVA C2 – FILA A/)
  assert.match(result.text, /Indica con una X/i)
})

test('removes an inline teacher-copy footer without deleting the teaching sentence before it', () => {
  const source = [
    'C Rispondere alle domande',
    "4. Nel rischio sismico, che cos’è la vulnerabilità?Copia riservata all'insegnante [dato di contatto rimosso]",
    '5. Descrivi una struttura reticolare.',
  ].join('\n')

  const result = normalizeKnowledgeWorkingText(source, { localPdfTextDerivative: true })

  assert.doesNotMatch(result.text, /Copia riservata all['’]insegnante/i)
  assert.match(result.text, /Nel rischio sismico, che cos’è la vulnerabilità\?/)
  assert.match(result.text, /Descrivi una struttura reticolare/)
})

test('preserves paragraph separators while removing inline footer noise', () => {
  const source = [
    'Prima sezione didattica.',
    '',
    "Seconda sezione utile.Copia riservata all'insegnante [dato di contatto rimosso]",
    '',
    'Terza sezione didattica.',
  ].join('\n')

  const result = normalizeKnowledgeWorkingText(source, { localPdfTextDerivative: true })

  assert.equal(result.text, 'Prima sezione didattica.\n\nSeconda sezione utile.\n\nTerza sezione didattica.')
})

test('chunks a long guide into bounded searchable units even without blank paragraphs', () => {
  const source = Array.from(
    { length: 180 },
    (_, index) => `Riga didattica ${index + 1}: descrizione operativa di Tecnologia con contenuto utile alla ricerca e alla progettazione.`,
  ).join('\n')

  const chunks = chunkKnowledgeText(source, 1200)

  assert.ok(chunks.length > 1)
  assert.ok(chunks.every((chunk) => chunk.length <= 1200))
  assert.match(chunks[0] ?? '', /Riga didattica 1:/)
  assert.match(chunks.at(-1) ?? '', /Riga didattica 180:/)
})

test('splits a single oversized line without exceeding the chunk budget', () => {
  const source = Array.from({ length: 500 }, (_, index) => `termine${index}`).join(' ')
  const chunks = chunkKnowledgeText(source, 1200)

  assert.ok(chunks.length > 1)
  assert.ok(chunks.every((chunk) => chunk.length <= 1200))
  assert.equal(chunks.join(' ').replace(/\s+/g, ' ').trim(), source)
})

test('keeps ordinary TXT unchanged', () => {
  const source = 'Nota di dipartimento\n\nPreparare il laboratorio di Tecnologia.'
  const result = normalizeKnowledgeWorkingText(source)
  assert.equal(result.text, source)
  assert.equal(result.removedBoilerplateLines, 0)
})

test('builds a useful summary instead of navigation boilerplate', () => {
  const source = [
    'per scaricare i contenuti online',
    'Vai su',
    'LEZIONE',
    'COMPITI',
    'VERIFICHE',
    'ORIENTAMENTO',
    'Idee per insegnare',
    'Programmazione per competenze e obiettivi minimi',
    'Educazione civica e Agenda 2030',
    'Prove di verifica di Tecnologia per capitolo',
    'Soluzioni del libro di Disegno e delle Tavole da disegno',
  ].join('\n')

  const summary = meaningfulKnowledgeSummary(source)
  assert.doesNotMatch(summary, /per scaricare/i)
  assert.match(summary, /Programmazione per competenze/i)
  assert.match(summary, /Prove di verifica di Tecnologia/i)
})

test('marks legal and form-template lines as highlight noise but preserves teaching prompts', () => {
  assert.equal(isKnowledgeHighlightNoise('Seconda edizione © Editore 2024'), true)
  assert.equal(isKnowledgeHighlightNoise('Copyright © 2024 Demo Editore'), true)
  assert.equal(isKnowledgeHighlightNoise('NOME ........ COGNOME ........ CLASSE .... DATA ....'), true)
  assert.equal(isKnowledgeHighlightNoise('nome:'), true)
  assert.equal(isKnowledgeHighlightNoise('Quali vantaggi offre l’uso dei mezzi pubblici?'), false)
})
