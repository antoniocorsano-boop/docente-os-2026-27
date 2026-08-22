export type AssistantActionKind =
  | 'READ_ONLY'
  | 'PROPOSE'
  | 'WRITE_REVERSIBLE'
  | 'WRITE_EXTERNAL'
  | 'INSTITUTIONAL_DECISION'

export type AssistantContext = {
  surface: 'KNOWLEDGE' | string
  workspaceId: string
  academicYearId?: string
  discipline?: string
  classLabel?: string
  object?: {
    type: string
    id: string
    title?: string
    state?: string
  }
  provenance: Array<{
    kind: string
    ref?: string
    label?: string
  }>
  availableCapabilities: string[]
  forbiddenCapabilities: string[]
  missingInformation: string[]
}

export type KnowledgeAssistantContext = AssistantContext & {
  surface: 'KNOWLEDGE'
  knowledge: {
    title: string
    category: string
    sourceLabel: string
    statusLabel: string
    summary?: string
    excerpt?: string
    contextReviewed: boolean
    hasOrganizedDocument: boolean
    actionProposalCount: number
    deadlineProposalCount: number
    disciplines: string[]
    classLabels: string[]
  }
}

export type KnowledgeAssistantContextInput = {
  workspaceId: string
  academicYearId?: string | null
  assetId: string
  title: string
  state: string
  category: string
  sourceLabel: string
  sourceRef?: string | null
  statusLabel: string
  summary?: string | null
  excerpt?: string | null
  contextReviewed: boolean
  hasOrganizedDocument: boolean
  actionProposalCount: number
  deadlineProposalCount: number
  disciplines: string[]
  classLabels: string[]
}

export const KNOWLEDGE_X3_CAPABILITIES = [
  'KNOWLEDGE_EXPLAIN_CONTEXT',
  'KNOWLEDGE_SUMMARIZE_STATE',
  'KNOWLEDGE_HIGHLIGHT_MISSING_CONTEXT',
  'KNOWLEDGE_LIST_PROPOSALS',
  'KNOWLEDGE_SUGGEST_NEXT_STEP',
] as const

export const KNOWLEDGE_X3_FORBIDDEN_CAPABILITIES = [
  'PLANNER_CREATE_TASK',
  'KNOWLEDGE_UPDATE_CONTEXT',
  'KNOWLEDGE_REPROCESS',
  'DRIVE_WRITE',
  'CALENDAR_WRITE',
  'GMAIL_SEND',
] as const

export function buildKnowledgeAssistantContext(input: KnowledgeAssistantContextInput): KnowledgeAssistantContext {
  const missingInformation: string[] = []

  if (!input.academicYearId) missingInformation.push('Anno scolastico non associato')
  if (input.disciplines.length === 0) missingInformation.push('Disciplina non associata')
  if (input.classLabels.length === 0) missingInformation.push('Classe o sezione non associata')
  if (!input.contextReviewed) missingInformation.push('Contesto professionale da controllare')
  if (!input.hasOrganizedDocument) missingInformation.push('Versione organizzata non disponibile')

  return {
    surface: 'KNOWLEDGE',
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId ?? undefined,
    discipline: input.disciplines[0],
    classLabel: input.classLabels[0],
    object: {
      type: 'KNOWLEDGE_ASSET',
      id: input.assetId,
      title: input.title,
      state: input.state,
    },
    provenance: [
      {
        kind: input.sourceLabel,
        ref: input.sourceRef ?? undefined,
        label: input.sourceLabel,
      },
    ],
    availableCapabilities: [...KNOWLEDGE_X3_CAPABILITIES],
    forbiddenCapabilities: [...KNOWLEDGE_X3_FORBIDDEN_CAPABILITIES],
    missingInformation,
    knowledge: {
      title: input.title,
      category: input.category,
      sourceLabel: input.sourceLabel,
      statusLabel: input.statusLabel,
      summary: cleanOptionalText(input.summary, 900),
      excerpt: cleanOptionalText(input.excerpt, 700),
      contextReviewed: input.contextReviewed,
      hasOrganizedDocument: input.hasOrganizedDocument,
      actionProposalCount: Math.max(0, input.actionProposalCount),
      deadlineProposalCount: Math.max(0, input.deadlineProposalCount),
      disciplines: [...input.disciplines],
      classLabels: [...input.classLabels],
    },
  }
}

export type AssistantResponse = {
  actionKind: Extract<AssistantActionKind, 'READ_ONLY' | 'PROPOSE'>
  text: string
}

export function respondToKnowledgeAssistant(context: KnowledgeAssistantContext, prompt: string): AssistantResponse {
  const normalized = normalize(prompt)

  if (isWriteRequest(normalized)) {
    return {
      actionKind: 'PROPOSE',
      text: [
        '**Ho trovato**',
        'La richiesta implica una modifica. In questa fase l’assistente non esegue scritture e non cambia documenti, attività operative, Piano annuale o fonti esterne.',
        '',
        '**Ti propongo**',
        manualPath(context, normalized),
        '',
        '**Se scegli questa opzione**',
        'Aprirai il percorso manuale già disponibile nella pagina; la modifica avverrà solo attraverso i controlli applicativi e la tua conferma.',
      ].join('\n'),
    }
  }

  if (containsAny(normalized, ['azione', 'azioni', 'scadenza', 'scadenze', 'deadline'])) {
    const total = context.knowledge.actionProposalCount + context.knowledge.deadlineProposalCount
    return {
      actionKind: 'READ_ONLY',
      text: [
        '**Ho trovato**',
        total > 0
          ? `Nel contenuto risultano ${context.knowledge.actionProposalCount} ${singular(context.knowledge.actionProposalCount, 'azione proposta', 'azioni proposte')} e ${context.knowledge.deadlineProposalCount} ${singular(context.knowledge.deadlineProposalCount, 'scadenza proposta', 'scadenze proposte')}.`
          : 'Non risultano azioni o scadenze proposte nel contenuto organizzato corrente.',
        '',
        '**Ti propongo**',
        total > 0
          ? 'Controlla le proposte nella sezione dedicata prima di trasformarle in attività operative.'
          : 'Se ti aspetti una scadenza, rileggi la fonte originale o aggiorna manualmente l’analisi dalla pagina.',
        '',
        '**Se scegli questa opzione**',
        'Non viene modificato nulla: stai solo verificando ciò che DOCENTE OS ha già organizzato.',
      ].join('\n'),
    }
  }

  if (containsAny(normalized, ['manca', 'mancano', 'controll', 'verific', 'complet'])) {
    return {
      actionKind: 'READ_ONLY',
      text: [
        '**Ho trovato**',
        context.missingInformation.length
          ? `Ci sono ${context.missingInformation.length} elementi da completare o controllare: ${context.missingInformation.join('; ')}.`
          : 'Il contesto minimo disponibile risulta completo e controllato.',
        '',
        '**Ti propongo**',
        context.missingInformation.length
          ? 'Parti dal primo elemento mancante e usa la sezione “Contesto professionale” della pagina.'
          : 'Puoi concentrarti sul contenuto e sulle eventuali proposte operative.',
        '',
        '**Se scegli questa opzione**',
        'La verifica resta manuale; l’assistente non cambia classificazioni o stati.',
      ].join('\n'),
    }
  }

  if (containsAny(normalized, ['prossimo', 'passo', 'cosa faccio', 'come procedo', 'adesso'])) {
    return {
      actionKind: 'PROPOSE',
      text: nextStepResponse(context),
    }
  }

  if (containsAny(normalized, ['contiene', 'riassum', 'spiega', 'documento', 'contenuto'])) {
    return {
      actionKind: 'READ_ONLY',
      text: summaryResponse(context),
    }
  }

  return {
    actionKind: 'PROPOSE',
    text: [
      '**Ho trovato**',
      `${context.knowledge.title} è un contenuto di tipo ${context.knowledge.category}, proveniente da ${context.knowledge.sourceLabel}, con stato “${context.knowledge.statusLabel}”.`,
      context.knowledge.summary || context.knowledge.excerpt
        ? `Sintesi disponibile: ${context.knowledge.summary ?? context.knowledge.excerpt}`
        : 'Non è disponibile una sintesi testuale sufficiente nel contesto minimizzato dell’assistente.',
      '',
      '**Ti propongo**',
      'Puoi chiedermi cosa contiene, cosa manca, quali azioni o scadenze sono state individuate oppure qual è il prossimo passo utile.',
      '',
      '**Se scegli questa opzione**',
      'Riceverai soltanto una lettura o una proposta: nessun dato viene modificato.',
    ].join('\n'),
  }
}

function summaryResponse(context: KnowledgeAssistantContext) {
  const references = [
    context.knowledge.disciplines.length ? `discipline: ${context.knowledge.disciplines.join(', ')}` : null,
    context.knowledge.classLabels.length ? `classi: ${context.knowledge.classLabels.join(', ')}` : null,
  ].filter(Boolean)

  return [
    '**Ho trovato**',
    `${context.knowledge.title} è classificato come ${context.knowledge.category} e proviene da ${context.knowledge.sourceLabel}. Stato: ${context.knowledge.statusLabel}.`,
    context.knowledge.summary || context.knowledge.excerpt
      ? context.knowledge.summary ?? context.knowledge.excerpt ?? ''
      : 'Nel contesto minimizzato non c’è ancora una sintesi testuale disponibile.',
    references.length ? `Riferimenti professionali: ${references.join(' · ')}.` : 'Non risultano ancora riferimenti completi a disciplina o classe.',
    '',
    '**Ti propongo**',
    context.knowledge.hasOrganizedDocument
      ? 'Usa la versione organizzata per orientarti e torna alla fonte originale quando devi verificare un passaggio puntuale.'
      : 'Consulta la fonte originale: la versione organizzata non è ancora disponibile.',
    '',
    '**Se scegli questa opzione**',
    'Non viene modificato nulla e la fonte originale resta invariata.',
  ].join('\n')
}

function nextStepResponse(context: KnowledgeAssistantContext) {
  const proposalCount = context.knowledge.actionProposalCount + context.knowledge.deadlineProposalCount
  let proposal: string

  if (context.missingInformation.length) {
    proposal = `Completa prima “${context.missingInformation[0]}”. Questo riduce il rischio di usare il contenuto nel contesto sbagliato.`
  } else if (proposalCount > 0) {
    proposal = `Rivedi le ${proposalCount} proposte individuate nel contenuto e decidi quali meritano di diventare attività operative.`
  } else if (context.knowledge.hasOrganizedDocument) {
    proposal = 'Leggi la versione organizzata e collegala al lavoro didattico solo se è pertinente alla classe o disciplina corrente.'
  } else {
    proposal = 'Consulta la fonte originale e, se serve, usa manualmente “Aggiorna analisi”.'
  }

  return [
    '**Ho trovato**',
    `Il contenuto è nello stato “${context.knowledge.statusLabel}”. ${context.missingInformation.length ? `Restano ${context.missingInformation.length} elementi da controllare.` : 'Il contesto minimo non presenta lacune evidenti.'}`,
    '',
    '**Ti propongo**',
    proposal,
    '',
    '**Se scegli questa opzione**',
    'L’assistente non esegue l’azione: ti indica soltanto il percorso. Le eventuali modifiche restano sotto il tuo controllo nella pagina.',
  ].join('\n')
}

function manualPath(context: KnowledgeAssistantContext, normalizedPrompt: string) {
  if (containsAny(normalizedPrompt, ['planner', 'attività', 'task', 'scadenza'])) {
    return 'Usa “Crea attività” nella pagina del documento dopo aver controllato titolo, data e priorità. L’attività comparirà in Oggi; non modifica il Piano annuale e non crea un evento nel Calendario.'
  }
  if (containsAny(normalizedPrompt, ['contesto', 'classe', 'disciplina', 'classific'])) {
    return 'Usa “Contesto professionale” per correggere classe, disciplina o stato del controllo.'
  }
  if (containsAny(normalizedPrompt, ['drive', 'originale', 'fonte'])) {
    return `Apri la fonte originale${context.knowledge.sourceLabel ? ` su ${context.knowledge.sourceLabel}` : ''} e modifica la fonte nel suo sistema di origine.`
  }
  return 'Usa i controlli manuali presenti nella pagina del documento. L’assistente può spiegarti quale controllo scegliere, ma non lo attiva.'
}

function isWriteRequest(normalizedPrompt: string) {
  return containsAny(normalizedPrompt, [
    'crea ',
    'creami',
    'aggiungi',
    'modifica',
    'cambia',
    'aggiorna',
    'salva',
    'elimina',
    'rimuovi',
    'invia',
    'pubblica',
    'conferma ',
    'approva',
    'attiva',
  ])
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('it-IT')
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}

function singular(count: number, singularValue: string, pluralValue: string) {
  return count === 1 ? singularValue : pluralValue
}

function cleanOptionalText(value: string | null | undefined, maxLength: number) {
  const cleaned = value?.replace(/\s+/g, ' ').trim()
  if (!cleaned) return undefined
  return cleaned.slice(0, maxLength)
}
