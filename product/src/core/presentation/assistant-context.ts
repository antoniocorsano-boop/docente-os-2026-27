export type AssistantActionKind =
  | 'READ_ONLY'
  | 'PROPOSE'
  | 'WRITE_REVERSIBLE'
  | 'WRITE_EXTERNAL'
  | 'INSTITUTIONAL_DECISION'

export type AssistantAnswerStatus = 'SUPPORTED' | 'PARTIAL' | 'NOT_FOUND'

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
    contentHighlights: string[]
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
  contentHighlights?: string[]
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

export type AssistantResponse = {
  actionKind: Extract<AssistantActionKind, 'READ_ONLY' | 'PROPOSE'>
  answerStatus: AssistantAnswerStatus
  grounding: {
    kind: 'PAGE_CONTEXT'
    evidenceCount: number
  }
  text: string
}

export type AssistantResponseContractCheck = {
  valid: boolean
  problems: string[]
}

const STOP_WORDS = new Set([
  'a', 'ad', 'al', 'alla', 'alle', 'allo', 'anche', 'che', 'chi', 'come', 'con', 'cosa', 'da', 'dal', 'dalla',
  'dei', 'del', 'della', 'delle', 'di', 'e', 'è', 'gli', 'i', 'il', 'in', 'la', 'le', 'lo', 'ma', 'mi', 'nel',
  'nella', 'non', 'o', 'per', 'più', 'puoi', 'questo', 'questa', 'se', 'si', 'su', 'sul', 'sulla', 'un', 'una',
  'vorrei', 'voglio', 'qual', 'quale', 'quali', 'quanto', 'quanta', 'quanti', 'quante',
])

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
      contentHighlights: cleanHighlights(input.contentHighlights),
      contextReviewed: input.contextReviewed,
      hasOrganizedDocument: input.hasOrganizedDocument,
      actionProposalCount: Math.max(0, input.actionProposalCount),
      deadlineProposalCount: Math.max(0, input.deadlineProposalCount),
      disciplines: [...input.disciplines],
      classLabels: [...input.classLabels],
    },
  }
}

export function validateAssistantResponseContract(response: AssistantResponse): AssistantResponseContractCheck {
  const problems: string[] = []
  const text = response.text.trim()

  if (text.length < 40) problems.push('La risposta è troppo breve per essere sostanziale.')
  if (response.grounding.evidenceCount < 0) problems.push('Il conteggio delle evidenze non può essere negativo.')
  if (response.answerStatus === 'SUPPORTED' && response.grounding.evidenceCount === 0) {
    problems.push('Una risposta SUPPORTED deve dichiarare almeno una evidenza disponibile.')
  }
  if (response.answerStatus === 'NOT_FOUND' && !/non trovo|non risulta|non disponibile/i.test(text)) {
    problems.push('Una risposta NOT_FOUND deve dichiarare esplicitamente l’assenza del dato.')
  }
  if (/^(apri|usa|vai|consulta)\b/i.test(text) && response.grounding.evidenceCount === 0) {
    problems.push('Una risposta non può ridursi a una istruzione di navigazione senza contenuto informativo.')
  }

  return { valid: problems.length === 0, problems }
}

export function respondToKnowledgeAssistant(context: KnowledgeAssistantContext, prompt: string): AssistantResponse {
  const normalized = normalize(prompt)

  if (isWriteRequest(normalized)) {
    return makeResponse('PROPOSE', 'SUPPORTED', writePreviewResponse(context, normalized), availableEvidenceCount(context))
  }

  if (containsAny(normalized, ['azione', 'azioni', 'scadenza', 'scadenze', 'deadline'])) {
    const total = context.knowledge.actionProposalCount + context.knowledge.deadlineProposalCount
    const text = [
      '**Ho trovato**',
      total > 0
        ? `Nel contenuto risultano ${context.knowledge.actionProposalCount} ${singular(context.knowledge.actionProposalCount, 'azione proposta', 'azioni proposte')} e ${context.knowledge.deadlineProposalCount} ${singular(context.knowledge.deadlineProposalCount, 'scadenza proposta', 'scadenze proposte')}.`
        : 'Non risultano azioni o scadenze proposte nel contenuto organizzato corrente.',
      ...evidenceBlock(context, 3),
      '',
      '**Ti propongo**',
      total > 0
        ? `Valuta le proposte rispetto a ${professionalContextLabel(context)} e usa i nuclei sopra come criterio di pertinenza.`
        : 'Se una scadenza è attesa ma non compare nell’analisi, il dato non è sostenuto dal contesto disponibile: va verificato sulla fonte originale.',
      '',
      '**Se scegli questa opzione**',
      'Non viene modificato nulla: stai solo verificando ciò che DOCENTE OS ha già organizzato.',
    ].join('\n')
    return makeResponse('READ_ONLY', total > 0 ? 'SUPPORTED' : 'NOT_FOUND', text, total > 0 ? Math.max(1, availableEvidenceCount(context)) : availableEvidenceCount(context))
  }

  if (containsAny(normalized, ['manca', 'mancano', 'controll', 'verific', 'complet'])) {
    const text = [
      '**Ho trovato**',
      context.missingInformation.length
        ? `Ci sono ${context.missingInformation.length} elementi da completare o controllare: ${context.missingInformation.join('; ')}.`
        : `Il contesto minimo risulta completo e controllato per ${professionalContextLabel(context)}.`,
      ...evidenceBlock(context, 3),
      '',
      '**Indicazione operativa**',
      context.missingInformation.length
        ? `La priorità è “${context.missingInformation[0]}”. Le altre informazioni già disponibili restano utilizzabili e sono riportate sopra.`
        : contextualReviewSuggestion(context),
      '',
      '**Limite operativo**',
      'La verifica resta manuale; l’assistente non cambia classificazioni o stati.',
    ].join('\n')
    return makeResponse('READ_ONLY', 'SUPPORTED', text, Math.max(1, availableEvidenceCount(context)))
  }

  if (containsAny(normalized, ['prossimo', 'passo', 'cosa faccio', 'come procedo', 'adesso'])) {
    return makeResponse('PROPOSE', 'SUPPORTED', nextStepResponse(context), Math.max(1, availableEvidenceCount(context)))
  }

  if (containsAny(normalized, ['contiene', 'riassum', 'spiega', 'documento', 'contenuto'])) {
    return makeResponse('READ_ONLY', 'SUPPORTED', summaryResponse(context), Math.max(1, availableEvidenceCount(context)))
  }

  if (containsAny(normalized, ['classe', 'lezione', 'didattic', 'student', 'attività', 'usare', 'utilizz', 'insegn'])) {
    return makeResponse('PROPOSE', 'SUPPORTED', didacticUseResponse(context), Math.max(1, availableEvidenceCount(context)))
  }

  return answerOpenQuestion(context, prompt)
}

function summaryResponse(context: KnowledgeAssistantContext) {
  const references = [
    context.knowledge.disciplines.length ? `discipline: ${context.knowledge.disciplines.join(', ')}` : null,
    context.knowledge.classLabels.length ? `classi: ${context.knowledge.classLabels.join(', ')}` : null,
  ].filter(Boolean)

  return [
    '**In sintesi**',
    context.knowledge.summary || context.knowledge.excerpt
      ? context.knowledge.summary ?? context.knowledge.excerpt ?? ''
      : `${context.knowledge.title} è classificato come ${context.knowledge.category} e proviene da ${context.knowledge.sourceLabel}.`,
    ...evidenceBlock(context, 6),
    '',
    '**Contesto professionale**',
    references.length ? references.join(' · ') : 'Non risultano ancora riferimenti completi a disciplina o classe.',
    '',
    '**Ti propongo**',
    context.knowledge.hasOrganizedDocument
      ? 'Usa questi nuclei per decidere che cosa è pertinente al tuo lavoro; torna alla fonte originale quando devi verificare una formulazione puntuale non presente nel contesto.'
      : 'La versione organizzata non è disponibile: posso usare solo i metadati e gli eventuali estratti già presenti.',
    '',
    '**Limite operativo**',
    'La risposta non modifica dati e non attribuisce al documento informazioni che non compaiono nel contesto disponibile.',
  ].join('\n')
}

function nextStepResponse(context: KnowledgeAssistantContext) {
  const proposalCount = context.knowledge.actionProposalCount + context.knowledge.deadlineProposalCount
  let proposal: string[]

  if (context.missingInformation.length) {
    proposal = [
      `Completa prima “${context.missingInformation[0]}”. Questo riduce il rischio di usare il contenuto nel contesto sbagliato.`,
      ...context.knowledge.contentHighlights.slice(0, 2).map((item) => `• ${item}`),
    ]
  } else if (proposalCount > 0) {
    proposal = [
      `Rivedi le ${proposalCount} proposte individuate e scegli quale è davvero pertinente a ${professionalContextLabel(context)}.`,
      ...context.knowledge.contentHighlights.slice(0, 2).map((item) => `• ${item}`),
      'Dopo la scelta posso preparare una anteprima dell’attività da inserire nel Planner, senza salvarla.',
    ]
  } else if (context.knowledge.hasOrganizedDocument) {
    proposal = [
      `Per ${professionalContextLabel(context)}, il passo più utile è scegliere quale nucleo del documento vuoi trasformare in lavoro didattico.`,
      ...context.knowledge.contentHighlights.slice(0, 3).map((item) => `• ${item}`),
      'Dopo la scelta posso preparare una anteprima dell’attività da inserire nel Planner, senza salvarla.',
    ]
  } else {
    proposal = [
      'La versione organizzata non è disponibile. Il prossimo passo utile è verificare la fonte originale prima di trasformare il contenuto in attività.',
    ]
  }

  return [
    '**Ho trovato**',
    `Il contenuto è nello stato “${context.knowledge.statusLabel}”. ${context.missingInformation.length ? `Restano ${context.missingInformation.length} elementi da controllare.` : `Il contesto risulta completo per ${professionalContextLabel(context)}.`}`,
    '',
    '**Ti propongo**',
    ...proposal,
    '',
    '**Se scegli questa opzione**',
    'L’assistente non esegue l’azione: prepara il percorso o l’anteprima con i dati disponibili. Le eventuali modifiche restano sotto il tuo controllo.',
  ].join('\n')
}

function didacticUseResponse(context: KnowledgeAssistantContext) {
  const focuses = context.knowledge.contentHighlights.slice(0, 3)
  return [
    '**Risposta**',
    `Per ${professionalContextLabel(context)}, questo contenuto può essere usato come base didattica senza inventare elementi ulteriori rispetto alla fonte.`,
    '',
    '**Nuclei utilizzabili**',
    ...(focuses.length ? focuses.map((item) => `• ${item}`) : [`• ${context.knowledge.summary ?? context.knowledge.excerpt ?? context.knowledge.title}`]),
    '',
    '**Suggerimento concreto**',
    focuses.length >= 2
      ? `Costruisci una attività in tre passaggi: comprensione del primo nucleo, applicazione sul secondo, restituzione finale collegata a ${professionalContextLabel(context)}.`
      : 'Usa il nucleo disponibile come oggetto di analisi e chiedi una restituzione osservabile; la consegna specifica va definita dal docente.',
    '',
    '**Limite operativo**',
    'Posso preparare l’anteprima dell’attività, ma in X3 non la salvo nel Planner e non modifico il Piano annuale.',
  ].join('\n')
}

function writePreviewResponse(context: KnowledgeAssistantContext, normalizedPrompt: string) {
  if (containsAny(normalizedPrompt, ['planner', 'attività', 'task', 'scadenza'])) {
    const proposedTitle = `Esamina e adatta per la classe: ${shorten(context.knowledge.title, 92)}`
    return [
      '**Ho trovato**',
      `La richiesta implica una modifica. Posso però costruire subito una proposta completa usando ${professionalContextLabel(context)} e i nuclei realmente disponibili.`,
      '',
      '**Anteprima proposta — nessuna scrittura eseguita**',
      `Titolo: ${proposedTitle}`,
      'Destinazione: Planner → Oggi',
      `Fonte: ${context.knowledge.title}`,
      `Contesto: ${professionalContextLabel(context)}`,
      'Data: da scegliere',
      'Priorità: Normale, da confermare',
      ...previewEvidence(context),
      '',
      '**Se scegli questa opzione**',
      `${manualPath(context, normalizedPrompt)} Prima della conferma potrai ancora modificare titolo, data e priorità. Non modifica il Piano annuale e non crea un evento nel Calendario.`,
    ].join('\n')
  }

  return [
    '**Risposta utile**',
    `La richiesta riguarda una modifica che X3 non può eseguire automaticamente. Il contenuto corrente è “${context.knowledge.statusLabel}”, proviene da ${context.knowledge.sourceLabel} ed è associato a ${professionalContextLabel(context)}.`,
    ...evidenceBlock(context, 2),
    '',
    '**Cosa posso preparare senza scrivere**',
    'Posso descrivere la modifica richiesta, controllarne la coerenza con il contenuto disponibile e preparare i valori o il testo da confermare manualmente.',
    '',
    '**Percorso di conferma**',
    manualPath(context, normalizedPrompt),
    '',
    '**Limite operativo**',
    'Nessuna modifica viene dichiarata come eseguita finché non passa dai controlli applicativi e dalla conferma umana prevista.',
  ].join('\n')
}

function answerOpenQuestion(context: KnowledgeAssistantContext, prompt: string): AssistantResponse {
  const ranked = rankEvidence(context, prompt)
  const matched = ranked.filter((item) => item.score > 0).slice(0, 3)
  const fallback = ranked.slice(0, 3)
  const evidence = matched.length ? matched : fallback
  const question = shorten(prompt.trim() || 'la domanda', 120)

  if (matched.length) {
    const text = [
      '**Risposta**',
      `Nel contesto disponibile trovo elementi pertinenti alla domanda “${question}”.`,
      ...evidence.map((item) => `• ${item.text}`),
      '',
      '**Lettura utile**',
      `Questi elementi sono sostenuti dal contenuto corrente e vanno letti nel contesto di ${professionalContextLabel(context)}.`,
      '',
      '**Suggerimento**',
      'Se vuoi trasformare questa lettura in una decisione o in una attività, posso preparare una proposta concreta senza eseguirla automaticamente.',
    ].join('\n')
    return makeResponse('READ_ONLY', 'SUPPORTED', text, evidence.length)
  }

  const text = [
    '**Risposta**',
    `Nel contesto disponibile non trovo un passaggio che risponda in modo specifico a “${question}”. Non attribuisco quindi al documento una risposta che non possiede.`,
    '',
    '**Quello che posso affermare**',
    ...(evidence.length
      ? evidence.map((item) => `• ${item.text}`)
      : [`• Il contenuto è “${context.knowledge.statusLabel}”, di tipo ${context.knowledge.category}, proveniente da ${context.knowledge.sourceLabel}.`]),
    '',
    '**Suggerimento**',
    context.knowledge.hasOrganizedDocument
      ? 'Posso comunque aiutarti a formulare una domanda più precisa sui nuclei disponibili oppure preparare una proposta basata esclusivamente su questi elementi.'
      : 'Per una risposta più specifica serve la fonte originale o una versione organizzata del contenuto.',
  ].join('\n')
  return makeResponse('READ_ONLY', 'NOT_FOUND', text, evidence.length)
}

function rankEvidence(context: KnowledgeAssistantContext, prompt: string) {
  const tokens = meaningfulTokens(prompt)
  const candidates = uniqueEvidence(context)
  return candidates
    .map((text, index) => ({ text, index, score: scoreEvidence(text, tokens) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
}

function uniqueEvidence(context: KnowledgeAssistantContext) {
  const values = [
    context.knowledge.summary,
    ...context.knowledge.contentHighlights,
    context.knowledge.excerpt,
  ]
  const seen = new Set<string>()
  return values.flatMap((value) => {
    const cleaned = cleanOptionalText(value, 900)
    if (!cleaned) return []
    const key = normalize(cleaned)
    if (seen.has(key)) return []
    seen.add(key)
    return [cleaned]
  })
}

function meaningfulTokens(value: string) {
  return normalize(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
}

function scoreEvidence(text: string, tokens: string[]) {
  if (!tokens.length) return 0
  const normalizedText = normalize(text)
  return tokens.reduce((score, token) => score + (normalizedText.includes(token) ? 1 : 0), 0)
}

function contextualReviewSuggestion(context: KnowledgeAssistantContext) {
  if (context.knowledge.contentHighlights.length === 0) {
    return `Il contesto è completo: puoi lavorare sulla sintesi disponibile per ${professionalContextLabel(context)}.`
  }
  return `Il contesto è completo: verifica ora se i nuclei emersi dal documento sono pertinenti a ${professionalContextLabel(context)}.`
}

function evidenceBlock(context: KnowledgeAssistantContext, limit: number) {
  const highlights = context.knowledge.contentHighlights.slice(0, limit)
  if (highlights.length === 0) return []
  return [
    '',
    '**Punti principali rilevati nel contenuto**',
    ...highlights.map((item) => `• ${item}`),
  ]
}

function previewEvidence(context: KnowledgeAssistantContext) {
  const highlights = context.knowledge.contentHighlights.slice(0, 2)
  if (highlights.length === 0) return []
  return [
    'Focus da verificare prima del salvataggio:',
    ...highlights.map((item) => `• ${item}`),
  ]
}

function professionalContextLabel(context: KnowledgeAssistantContext) {
  const disciplines = context.knowledge.disciplines.join(', ')
  const classes = context.knowledge.classLabels.join(', ')
  if (disciplines && classes) return `${disciplines} · ${classes}`
  if (disciplines) return disciplines
  if (classes) return classes
  return 'il contesto professionale corrente'
}

function manualPath(context: KnowledgeAssistantContext, normalizedPrompt: string) {
  if (containsAny(normalizedPrompt, ['planner', 'attività', 'task', 'scadenza'])) {
    return 'Usa “Crea attività” nella pagina del documento solo dopo aver controllato l’anteprima.'
  }
  if (containsAny(normalizedPrompt, ['contesto', 'classe', 'disciplina', 'classific'])) {
    return 'Usa “Contesto professionale” per correggere classe, disciplina o stato del controllo.'
  }
  if (containsAny(normalizedPrompt, ['drive', 'originale', 'fonte'])) {
    return `Apri la fonte originale${context.knowledge.sourceLabel ? ` su ${context.knowledge.sourceLabel}` : ''} e modifica la fonte nel suo sistema di origine.`
  }
  return 'Usa i controlli manuali presenti nella pagina del documento dopo aver verificato la proposta preparata dall’assistente.'
}

function makeResponse(
  actionKind: AssistantResponse['actionKind'],
  answerStatus: AssistantAnswerStatus,
  text: string,
  evidenceCount: number,
): AssistantResponse {
  return {
    actionKind,
    answerStatus,
    grounding: {
      kind: 'PAGE_CONTEXT',
      evidenceCount: Math.max(0, evidenceCount),
    },
    text,
  }
}

function availableEvidenceCount(context: KnowledgeAssistantContext) {
  return uniqueEvidence(context).length
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

function cleanHighlights(values: string[] | undefined) {
  const seen = new Set<string>()
  const cleaned: string[] = []
  for (const value of values ?? []) {
    const item = cleanOptionalText(value, 220)
    if (!item) continue
    const key = item.toLocaleLowerCase('it-IT')
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push(item)
    if (cleaned.length === 10) break
  }
  return cleaned
}

function shorten(value: string, maxLength: number) {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`
}
