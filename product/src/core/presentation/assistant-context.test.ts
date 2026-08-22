import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildKnowledgeAssistantContext,
  KNOWLEDGE_X3_CAPABILITIES,
  KNOWLEDGE_X3_FORBIDDEN_CAPABILITIES,
  respondToKnowledgeAssistant,
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

test('Knowledge AssistantContext minimizes long text sent to the client runtime', () => {
  const context = build({ summary: 'a'.repeat(1200), excerpt: 'b'.repeat(1000) })

  assert.equal(context.knowledge.summary?.length, 900)
  assert.equal(context.knowledge.excerpt?.length, 700)
})

test('read-only response reports authentic proposal counts', () => {
  const response = respondToKnowledgeAssistant(build(), 'Ci sono azioni o scadenze?')

  assert.equal(response.actionKind, 'READ_ONLY')
  assert.match(response.text, /2 azioni proposte/)
  assert.match(response.text, /1 scadenza proposta/)
  assert.match(response.text, /Non viene modificato nulla/)
})

test('write-like request is downgraded to a proposal and never claims a write occurred', () => {
  const response = respondToKnowledgeAssistant(build(), 'Crea una attività')

  assert.equal(response.actionKind, 'PROPOSE')
  assert.match(response.text, /non esegue scritture/i)
  assert.match(response.text, /Crea attività/)
  assert.match(response.text, /non modifica il Piano annuale/i)
  assert.match(response.text, /non crea un evento nel Calendario/i)
  assert.doesNotMatch(response.text, /attività (è stata|creata)/i)
})

test('next-step proposal prioritizes missing context over operational suggestions', () => {
  const context = build({ contextReviewed: false })
  const response = respondToKnowledgeAssistant(context, 'Qual è il prossimo passo?')

  assert.equal(response.actionKind, 'PROPOSE')
  assert.match(response.text, /Contesto professionale da controllare/)
  assert.match(response.text, /non esegue l’azione/i)
})
