import assert from 'node:assert/strict'
import test from 'node:test'
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
  assert.equal(isKnowledgeHighlightNoise('NOME ........ COGNOME ........ CLASSE .... DATA ....'), true)
  assert.equal(isKnowledgeHighlightNoise('Quali vantaggi offre l’uso dei mezzi pubblici?'), false)
})
