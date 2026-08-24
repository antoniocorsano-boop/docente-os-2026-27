import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildKnowledgeAssistantContext,
  KNOWLEDGE_X3_CAPABILITIES,
  KNOWLEDGE_X3_FORBIDDEN_CAPABILITIES,
  respondToKnowledgeAssistant,
  validateAssistantResponseContract,
  type AssistantResponse,
} from './assistant-context'

function build(overrides: Partial<Parameters<typeof buildKnowledgeAssistantContext>[0]> = {}) {
  return buildKnowledgeAssistantContext({
    workspaceId: 'workspace-1',
    academicYearId: 'year-1',
    assetId: 'asset-1',
    title: 'Piano annuale Tecnologia',
    state: 'SUCCEEDED',
    category: 'Piano annuale',
    sourceLabel: 'Google Drive',
    sourceRef: 'drive-file-1',
    statusLabel: 'Pronto',
    summary: 'Piano operativo di Tecnologia per la classe prima.',
    excerpt: 'Estratto lungo del documento.',
    contentHighlights: [
      'Uso critico delle fonti digitali e verifica delle informazioni.',
      'Attività laboratoriale con prodotto finale osservabile.',
      'Riflessione conclusiva e autovalutazione degli studenti.',
    ],
    contextReviewed: true,
    hasOrganizedDocument: true,
    actionProposalCount: 2,
    deadlineProposalCount: 1,
    disciplines: ['Tecnologia'],
    classLabels: ['1A'],
    ...overrides,
  })
}

test('Knowledge AssistantContext exposes only the X3 allowlist and explicit forbidden capabilities', () => {
  const context = build()

  assert.deepEqual(context.availableCapabilities, [...KNOWLEDGE_X3_CAPABILITIES])
  assert.deepEqual(context.forbiddenCapabilities, [...KNOWLEDGE_X3_FORBIDDEN_CAPABILITIES])
  assert.equal(context.availableCapabilities.some((item) => item.includes('CREATE')), false)
  assert.equal(context.availableCapabilities.some((item) => item.includes('WRITE')), false)
})

test('Knowledge AssistantContext records missing professional information', () => {
  const context = build({
    academicYearId: null,
    contextReviewed: false,
    hasOrganizedDocument: false,
    disciplines: [],
    classLabels: [],
  })

  assert.deepEqual(context.missingInformation, [
    'Anno scolastico non associato',
    'Disciplina non associata',
    'Classe o sezione non associata',
    'Contesto professionale da controllare',
    'Versione organizzata non disponibile',
  ])
})

test('Knowledge AssistantContext minimizes long text and distributed highlights sent to the client runtime', () => {
  const context = build({
    summary: 'a'.repeat(1200),
    excerpt: 'b'.repeat(1000),
    contentHighlights: Array.from({ length: 14 }, (_, index) => `${index}-${'c'.repeat(260)}`),
  })

  assert.equal(context.knowledge.summary?.length, 900)
  assert.equal(context.knowledge.excerpt?.length, 700)
  assert.equal(context.knowledge.contentHighlights.length, 10)
  assert.ok(context.knowledge.contentHighlights.every((item) => item.length <= 220))
})

test('read-only response reports authentic proposal counts', () => {
  const response = respondToKnowledgeAssistant(build(), 'Ci sono azioni o scadenze?')

  assert.equal(response.actionKind, 'READ_ONLY')
  assert.equal(response.answerStatus, 'SUPPORTED')
  assert.match(response.text, /2 azioni proposte/)
  assert.match(response.text, /1 scadenza proposta/)
  assert.match(response.text, /Uso critico delle fonti digitali/)
  assert.match(response.text, /Non viene modificato nulla/)
})

test('document summary surfaces distributed evidence instead of returning only metadata and the opening excerpt', () => {
  const response = respondToKnowledgeAssistant(build(), 'Cosa contiene questo documento?')

  assert.equal(response.actionKind, 'READ_ONLY')
  assert.equal(response.answerStatus, 'SUPPORTED')
  assert.match(response.text, /Punti principali rilevati nel contenuto/)
  assert.match(response.text, /Uso critico delle fonti digitali/)
  assert.match(response.text, /Attività laboratoriale/)
  assert.match(response.text, /Tecnologia/)
  assert.match(response.text, /1A/)
})

test('write-like Planner request becomes a structured preview and never claims a write occurred', () => {
  const response = respondToKnowledgeAssistant(build(), 'Crea una attività nel Planner')

  assert.equal(response.actionKind, 'PROPOSE')
  assert.equal(response.answerStatus, 'SUPPORTED')
  assert.match(response.text, /Anteprima proposta/i)
  assert.match(response.text, /Destinazione: Planner → Oggi/)
  assert.match(response.text, /Data: da scegliere/)
  assert.match(response.text, /Priorità: Normale, da confermare/)
  assert.match(response.text, /Crea attività/)
  assert.match(response.text, /non modifica il Piano annuale/i)
  assert.match(response.text, /non crea un evento nel Calendario/i)
  assert.match(response.text, /Uso critico delle fonti digitali/)
  assert.doesNotMatch(response.text, /ho creato|attività creata|attività è stata/i)
})

test('generic write request still gives substantive information before the manual boundary', () => {
  const response = respondToKnowledgeAssistant(build(), 'Modifica la classificazione del documento')

  assert.equal(response.actionKind, 'PROPOSE')
  assert.equal(response.answerStatus, 'SUPPORTED')
  assert.match(response.text, /Risposta utile/)
  assert.match(response.text, /Pronto/)
  assert.match(response.text, /Google Drive/)
  assert.match(response.text, /Tecnologia · 1A/)
  assert.match(response.text, /Uso critico delle fonti digitali/)
  assert.match(response.text, /Contesto professionale/)
  assert.doesNotMatch(response.text, /^Usa /)
})

test('next-step proposal prioritizes missing context over operational suggestions but still carries evidence', () => {
  const context = build({ contextReviewed: false })
  const response = respondToKnowledgeAssistant(context, 'Qual è il prossimo passo?')

  assert.equal(response.actionKind, 'PROPOSE')
  assert.match(response.text, /Contesto professionale da controllare/)
  assert.match(response.text, /Uso critico delle fonti digitali/)
  assert.match(response.text, /non esegue l’azione/i)
})

test('next-step proposal keeps document evidence and preview path when extracted proposals already exist', () => {
  const context = build({
    disciplines: ['Tecnologia', 'educazione civica'],
    classLabels: ['3A', '3C'],
  })
  const response = respondToKnowledgeAssistant(context, 'Qual è il prossimo passo utile?')

  assert.equal(response.actionKind, 'PROPOSE')
  assert.match(response.text, /3 proposte individuate/)
  assert.match(response.text, /Tecnologia, educazione civica · 3A, 3C/)
  assert.match(response.text, /Uso critico delle fonti digitali/)
  assert.match(response.text, /Attività laboratoriale/)
  assert.match(response.text, /anteprima dell’attività/i)
  assert.match(response.text, /senza salvarla/i)
  assert.match(response.text, /non esegue l’azione/i)
})

test('next-step proposal uses document evidence and the complete professional context when nothing is missing', () => {
  const context = build({
    actionProposalCount: 0,
    deadlineProposalCount: 0,
    disciplines: ['Tecnologia', 'educazione civica'],
    classLabels: ['3A', '3C'],
  })
  const response = respondToKnowledgeAssistant(context, 'Qual è il prossimo passo utile?')

  assert.equal(response.actionKind, 'PROPOSE')
  assert.match(response.text, /Tecnologia, educazione civica · 3A, 3C/)
  assert.match(response.text, /Uso critico delle fonti digitali/)
  assert.match(response.text, /anteprima dell’attività/i)
  assert.match(response.text, /non esegue l’azione/i)
})

test('open question retrieves relevant evidence instead of returning a menu of suggested prompts', () => {
  const response = respondToKnowledgeAssistant(build(), 'Come viene affrontata la verifica delle informazioni?')

  assert.equal(response.actionKind, 'READ_ONLY')
  assert.equal(response.answerStatus, 'SUPPORTED')
  assert.ok(response.grounding.evidenceCount > 0)
  assert.match(response.text, /Uso critico delle fonti digitali e verifica delle informazioni/)
  assert.doesNotMatch(response.text, /Puoi chiedermi cosa contiene/)
  assert.equal(validateAssistantResponseContract(response).valid, true)
})

test('unknown question states the evidentiary gap and still gives the closest supported information', () => {
  const response = respondToKnowledgeAssistant(build(), 'Quale software CAD viene indicato?')

  assert.equal(response.actionKind, 'READ_ONLY')
  assert.equal(response.answerStatus, 'NOT_FOUND')
  assert.match(response.text, /non trovo un passaggio che risponda in modo specifico/i)
  assert.match(response.text, /Quello che posso affermare/)
  assert.match(response.text, /Piano operativo di Tecnologia|Uso critico delle fonti digitali/)
  assert.doesNotMatch(response.text, /AutoCAD|SketchUp|FreeCAD/i)
  assert.equal(validateAssistantResponseContract(response).valid, true)
})

test('didactic-use question produces a concrete grounded teaching suggestion without writing', () => {
  const response = respondToKnowledgeAssistant(build(), 'Come posso usarlo in classe con gli studenti?')

  assert.equal(response.actionKind, 'PROPOSE')
  assert.equal(response.answerStatus, 'SUPPORTED')
  assert.match(response.text, /Nuclei utilizzabili/)
  assert.match(response.text, /Uso critico delle fonti digitali/)
  assert.match(response.text, /Attività laboratoriale/)
  assert.match(response.text, /tre passaggi/i)
  assert.match(response.text, /non la salvo nel Planner/i)
  assert.equal(validateAssistantResponseContract(response).valid, true)
})

test('answer contract rejects navigation-only evasive responses', () => {
  const evasive: AssistantResponse = {
    actionKind: 'PROPOSE',
    answerStatus: 'NOT_FOUND',
    grounding: { kind: 'PAGE_CONTEXT', evidenceCount: 0 },
    text: 'Apri la pagina e controlla lì.',
  }

  const check = validateAssistantResponseContract(evasive)
  assert.equal(check.valid, false)
  assert.ok(check.problems.length >= 2)
})

test('all standard assistant routes satisfy the answer contract', () => {
  const prompts = [
    'Cosa contiene questo documento?',
    'Cosa devo controllare?',
    'Ci sono azioni o scadenze?',
    'Qual è il prossimo passo utile?',
    'Come posso usarlo in classe?',
    'Crea una attività nel Planner',
    'Dimmi qualcosa sulla verifica delle informazioni',
    'Quale norma UNI viene citata?',
  ]

  for (const prompt of prompts) {
    const response = respondToKnowledgeAssistant(build(), prompt)
    const check = validateAssistantResponseContract(response)
    assert.equal(check.valid, true, `${prompt}: ${check.problems.join('; ')}`)
  }
})
