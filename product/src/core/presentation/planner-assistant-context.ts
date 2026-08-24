import type { PlannerTask, PlannerTaskPriority, PlannerTaskSourceKind, PlannerTaskStatus } from '@/core/domain/planner-task'
import type { AssistantContext, AssistantResponse } from './assistant-context'

export type PlannerAssistantTask = {
  id: string
  title: string
  notes?: string
  status: PlannerTaskStatus
  priority: PlannerTaskPriority
  dueDate?: string
  plannedFor?: string
  sourceKind: PlannerTaskSourceKind
}

export type PlannerAssistantContext = AssistantContext & {
  surface: 'PLANNER'
  planner: {
    localDate: string
    activeCount: number
    openCount: number
    waitingCount: number
    overdueCount: number
    todayCount: number
    urgentCount: number
    highCount: number
    undatedCount: number
    tasks: PlannerAssistantTask[]
  }
}

export const PLANNER_X3_CAPABILITIES = [
  'PLANNER_SUMMARIZE',
  'PLANNER_PRIORITIZE',
  'PLANNER_EXPLAIN_TASKS',
  'PLANNER_SUGGEST_PLAN',
] as const

export const PLANNER_X3_FORBIDDEN_CAPABILITIES = [
  'PLANNER_CREATE_TASK',
  'PLANNER_COMPLETE_TASK',
  'PLANNER_REOPEN_TASK',
  'PLANNER_MOVE_TASK',
  'PLANNER_DELETE_TASK',
  'CALENDAR_WRITE',
  'DRIVE_WRITE',
  'GMAIL_SEND',
] as const

export function buildPlannerAssistantContext(input: {
  workspaceId: string
  academicYearId?: string | null
  localDate: string
  tasks: PlannerTask[]
}): PlannerAssistantContext {
  const active = input.tasks.filter((task) => task.status !== 'DONE' && task.status !== 'CANCELLED')
  const open = active.filter((task) => task.status === 'OPEN')
  const waiting = active.filter((task) => task.status === 'WAITING')
  const sorted = [...active].sort((a, b) => comparePlannerTasks(a, b, input.localDate))
  const minimized = sorted.slice(0, 20).map(minimizeTask)

  return {
    surface: 'PLANNER',
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId ?? undefined,
    provenance: [{ kind: 'PLANNER', label: 'Planner DOCENTE OS' }],
    availableCapabilities: [...PLANNER_X3_CAPABILITIES],
    forbiddenCapabilities: [...PLANNER_X3_FORBIDDEN_CAPABILITIES],
    missingInformation: [],
    planner: {
      localDate: input.localDate,
      activeCount: active.length,
      openCount: open.length,
      waitingCount: waiting.length,
      overdueCount: open.filter((task) => dueDate(task) && dueDate(task)! < input.localDate).length,
      todayCount: open.filter((task) => task.plannedFor === input.localDate || dueDate(task) === input.localDate).length,
      urgentCount: open.filter((task) => task.priority === 'URGENT').length,
      highCount: open.filter((task) => task.priority === 'HIGH').length,
      undatedCount: open.filter((task) => !task.plannedFor && !dueDate(task)).length,
      tasks: minimized,
    },
  }
}

export function respondToPlannerAssistant(context: PlannerAssistantContext, prompt: string): AssistantResponse {
  const normalized = normalize(prompt)

  if (isWriteRequest(normalized)) return proposedWriteResponse(context, prompt)

  if (containsAny(normalized, ['urgent', 'priorit', 'prima', 'adesso', 'subito', 'scadut'])) {
    return prioritizeResponse(context)
  }

  if (containsAny(normalized, ['oggi', 'organizz', 'pianific', 'giornata', 'ordine'])) {
    return todayPlanResponse(context)
  }

  if (containsAny(normalized, ['attesa', 'aspett', 'blocc'])) {
    return waitingResponse(context)
  }

  if (containsAny(normalized, ['cosa ho', 'cosa devo', 'da fare', 'attività', 'riepilog', 'situazione'])) {
    return summaryResponse(context)
  }

  return openPlannerQuestion(context, prompt)
}

function summaryResponse(context: PlannerAssistantContext): AssistantResponse {
  const p = context.planner
  const text = [
    '**Situazione Planner**',
    p.activeCount === 0
      ? 'Non risultano attività attive nel Planner.'
      : `Hai ${p.activeCount} attività attive: ${p.openCount} aperte e ${p.waitingCount} in attesa. ${p.overdueCount} sono scadute, ${p.todayCount} riguardano oggi, ${p.urgentCount} hanno priorità urgente e ${p.highCount} priorità alta.`,
    '',
    '**Da tenere davanti**',
    ...taskLines(context, 5),
    '',
    '**Indicazione utile**',
    p.activeCount === 0
      ? 'Il Planner non richiede una decisione immediata: puoi passare alla preparazione didattica o controllare l’orario.'
      : 'Parti dalle attività scadute o urgenti; poi chiudi ciò che riguarda oggi prima di anticipare il resto della settimana.',
    '',
    '**Limite operativo**',
    'Posso leggere, ordinare e proporre. Non completo, sposto o creo attività automaticamente in X3.',
  ].join('\n')
  return response('READ_ONLY', 'SUPPORTED', text, Math.max(1, p.tasks.length))
}

function prioritizeResponse(context: PlannerAssistantContext): AssistantResponse {
  const ordered = actionableTasks(context)
  const top = ordered.slice(0, 5)
  const text = [
    '**Priorità reale**',
    top.length
      ? `Le prime ${top.length} attività da considerare sono ordinate per scadenza, urgenza, pianificazione e priorità.`
      : 'Non risultano attività aperte da prioritizzare.',
    ...top.map((task, index) => `• ${index + 1}. ${describeTask(task, context.planner.localDate)}`),
    '',
    '**Criterio usato**',
    'Prima le scadute; poi le urgenti con scadenza odierna, le attività previste per oggi, le priorità alte e infine le altre attività attive.',
    '',
    '**Suggerimento**',
    top[0]
      ? `Concentrati prima su “${top[0].title}”. Se non è realmente eseguibile adesso, il passo corretto è decidere esplicitamente se metterla in attesa o ripianificarla.`
      : 'Non serve forzare una priorità: il Planner è libero da attività aperte.',
    '',
    '**Limite operativo**',
    'La priorità è una proposta fondata sui dati del Planner; nessuno stato viene modificato.',
  ].join('\n')
  return response('PROPOSE', 'SUPPORTED', text, Math.max(1, top.length))
}

function todayPlanResponse(context: PlannerAssistantContext): AssistantResponse {
  const p = context.planner
  const ordered = actionableTasks(context)
  const now = ordered.filter((task) => isOverdue(task, p.localDate) || isToday(task, p.localDate) || task.priority === 'URGENT')
  const plan = (now.length ? now : ordered).slice(0, 4)
  const text = [
    '**Piano di lavoro per oggi**',
    plan.length
      ? 'Questa è una sequenza proposta usando soltanto stato, priorità e date registrate nel Planner.'
      : 'Non ci sono attività aperte da distribuire nella giornata.',
    ...plan.map((task, index) => `• ${index + 1}. ${describeTask(task, p.localDate)}`),
    '',
    '**Controllo prima di iniziare**',
    p.waitingCount
      ? `Ci sono anche ${p.waitingCount} attività in attesa: non le porto davanti alle attività eseguibili finché il blocco non viene rimosso.`
      : 'Non risultano attività in attesa che richiedano un controllo separato.',
    '',
    '**Suggerimento**',
    plan.length > 1
      ? 'Lavora su una attività alla volta: chiudi o ripianifica esplicitamente la prima prima di passare alla successiva.'
      : plan.length === 1
        ? 'Concentra la giornata su questa attività e decidi il resto solo dopo averla chiusa o ripianificata.'
        : 'Puoi usare il tempo disponibile per preparazione didattica, classi o attività future.',
    '',
    '**Limite operativo**',
    'Non sposto automaticamente le attività tra Oggi, Domani o Settimana.',
  ].join('\n')
  return response('PROPOSE', 'SUPPORTED', text, Math.max(1, plan.length))
}

function waitingResponse(context: PlannerAssistantContext): AssistantResponse {
  const waiting = context.planner.tasks.filter((task) => task.status === 'WAITING')
  const text = [
    '**Attività in attesa**',
    waiting.length ? `Risultano ${waiting.length} attività in attesa tra quelle incluse nel contesto corrente.` : 'Non risultano attività in attesa.',
    ...waiting.slice(0, 8).map((task) => `• ${describeTask(task, context.planner.localDate)}`),
    '',
    '**Indicazione utile**',
    waiting.length
      ? 'Per ciascuna attività in attesa, verifica se il vincolo esterno esiste ancora. Solo dopo ha senso riaprirla o ripianificarla.'
      : 'Non ci sono blocchi espliciti da riesaminare nel Planner corrente.',
    '',
    '**Limite operativo**',
    'Non riapro né modifico lo stato delle attività senza una capacità di scrittura esplicitamente autorizzata.',
  ].join('\n')
  return response('READ_ONLY', 'SUPPORTED', text, Math.max(1, waiting.length))
}

function proposedWriteResponse(context: PlannerAssistantContext, prompt: string): AssistantResponse {
  const candidates = rankTasks(context, prompt).slice(0, 4)
  const requested = shorten(prompt.trim(), 150)
  const text = [
    '**Risposta utile**',
    `La richiesta “${requested}” implica una modifica del Planner. In X3 non la eseguo, ma posso mostrarti su quali attività sembra incidere e che cosa va confermato.`,
    '',
    '**Attività pertinenti**',
    ...(candidates.length
      ? candidates.map((task) => `• ${describeTask(task, context.planner.localDate)}`)
      : ['• Non individuo con sufficiente certezza una attività specifica nel contesto minimizzato.']),
    '',
    '**Anteprima della decisione**',
    candidates[0]
      ? `Prima di confermare, verifica che l’attività sia “${candidates[0].title}” e scegli esplicitamente il nuovo stato o la nuova collocazione temporale.`
      : 'Serve selezionare esplicitamente l’attività e il cambiamento desiderato; non assegno valori non presenti nella richiesta.',
    '',
    '**Limite operativo**',
    'Nessuna attività è stata creata, completata, riaperta, spostata o eliminata.',
  ].join('\n')
  return response('PROPOSE', candidates.length ? 'SUPPORTED' : 'PARTIAL', text, Math.max(1, candidates.length))
}

function openPlannerQuestion(context: PlannerAssistantContext, prompt: string): AssistantResponse {
  const ranked = rankTasks(context, prompt)
  const tokens = meaningfulTokens(prompt)
  const matched = ranked.filter((task) => taskMatchScore(task, tokens) > 0).slice(0, 5)

  if (matched.length) {
    const text = [
      '**Risposta**',
      `Nel Planner trovo ${matched.length} attività pertinenti alla domanda.`,
      ...matched.map((task) => `• ${describeTask(task, context.planner.localDate)}`),
      '',
      '**Lettura utile**',
      'La risposta usa soltanto titolo, note minimizzate, stato, priorità e date delle attività correnti.',
      '',
      '**Suggerimento**',
      'Se vuoi, posso anche ordinarle per urgenza o costruire una sequenza di lavoro per oggi senza modificare il Planner.',
    ].join('\n')
    return response('READ_ONLY', 'SUPPORTED', text, matched.length)
  }

  const text = [
    '**Risposta**',
    `Non trovo nel Planner una attività che risponda in modo specifico a “${shorten(prompt.trim(), 120)}”. Non invento quindi un collegamento.`,
    '',
    '**Quello che risulta comunque**',
    `• ${context.planner.activeCount} attività attive; ${context.planner.overdueCount} scadute; ${context.planner.todayCount} per oggi; ${context.planner.waitingCount} in attesa.`,
    ...taskLines(context, 3),
    '',
    '**Suggerimento**',
    'Posso rispondere su priorità, scadenze, attività di oggi, elementi in attesa o su una attività nominata esplicitamente.',
  ].join('\n')
  return response('READ_ONLY', 'NOT_FOUND', text, Math.max(1, context.planner.tasks.length ? 1 : 0))
}

function actionableTasks(context: PlannerAssistantContext) {
  return context.planner.tasks
    .filter((task) => task.status === 'OPEN')
    .sort((a, b) => compareAssistantTasks(a, b, context.planner.localDate))
}

function taskLines(context: PlannerAssistantContext, limit: number) {
  const tasks = actionableTasks(context).slice(0, limit)
  return tasks.length
    ? tasks.map((task) => `• ${describeTask(task, context.planner.localDate)}`)
    : ['• Nessuna attività aperta da mostrare.']
}

function describeTask(task: PlannerAssistantTask, localDate: string) {
  const facts = [priorityLabel(task.priority)]
  if (task.status === 'WAITING') facts.push('in attesa')
  if (task.dueDate) facts.push(task.dueDate < localDate ? `scaduta il ${task.dueDate}` : task.dueDate === localDate ? 'scade oggi' : `scade ${task.dueDate}`)
  if (task.plannedFor) facts.push(task.plannedFor === localDate ? 'pianificata oggi' : `pianificata ${task.plannedFor}`)
  if (!task.dueDate && !task.plannedFor) facts.push('senza data')
  return `${task.title} — ${facts.join(', ')}`
}

function comparePlannerTasks(a: PlannerTask, b: PlannerTask, localDate: string) {
  return compareAssistantTasks(minimizeTask(a), minimizeTask(b), localDate)
}

function compareAssistantTasks(a: PlannerAssistantTask, b: PlannerAssistantTask, localDate: string) {
  const aBucket = taskBucket(a, localDate)
  const bBucket = taskBucket(b, localDate)
  if (aBucket !== bBucket) return aBucket - bBucket
  const priorityRank = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const
  if (priorityRank[a.priority] !== priorityRank[b.priority]) return priorityRank[a.priority] - priorityRank[b.priority]
  const aDate = a.dueDate ?? a.plannedFor ?? '9999-12-31'
  const bDate = b.dueDate ?? b.plannedFor ?? '9999-12-31'
  if (aDate !== bDate) return aDate.localeCompare(bDate)
  return a.title.localeCompare(b.title, 'it')
}

function taskBucket(task: PlannerAssistantTask, localDate: string) {
  if (task.status === 'WAITING') return 5
  if (isOverdue(task, localDate)) return 0
  if (task.priority === 'URGENT' && task.dueDate && task.dueDate <= localDate) return 1
  if (isToday(task, localDate)) return 2
  if (task.priority === 'URGENT' || task.priority === 'HIGH') return 3
  return 4
}

function isToday(task: PlannerAssistantTask, localDate: string) {
  return task.plannedFor === localDate || task.dueDate === localDate
}

function isOverdue(task: PlannerAssistantTask, localDate: string) {
  return Boolean(task.dueDate && task.dueDate < localDate)
}

function minimizeTask(task: PlannerTask): PlannerAssistantTask {
  return {
    id: task.id,
    title: task.title.trim().slice(0, 180),
    notes: task.notes?.replace(/\s+/g, ' ').trim().slice(0, 240) || undefined,
    status: task.status,
    priority: task.priority,
    dueDate: dueDate(task) ?? undefined,
    plannedFor: task.plannedFor ?? undefined,
    sourceKind: task.sourceKind,
  }
}

function dueDate(task: PlannerTask) {
  return task.dueAt?.slice(0, 10) ?? null
}

function rankTasks(context: PlannerAssistantContext, prompt: string) {
  const tokens = meaningfulTokens(prompt)
  return [...context.planner.tasks].sort((a, b) => {
    const byMatch = taskMatchScore(b, tokens) - taskMatchScore(a, tokens)
    if (byMatch !== 0) return byMatch
    return compareAssistantTasks(a, b, context.planner.localDate)
  })
}

function taskMatchScore(task: PlannerAssistantTask, tokens: string[]) {
  const text = normalize(`${task.title} ${task.notes ?? ''} ${task.priority} ${task.status} ${task.sourceKind}`)
  return tokens.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0)
}

function meaningfulTokens(value: string) {
  const stop = new Set(['come', 'cosa', 'devo', 'delle', 'della', 'dello', 'degli', 'sono', 'questa', 'questo', 'quali', 'qual', 'posso', 'fare', 'vorrei', 'voglio'])
  return normalize(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stop.has(token))
}

function priorityLabel(priority: PlannerTaskPriority) {
  if (priority === 'URGENT') return 'urgente'
  if (priority === 'HIGH') return 'priorità alta'
  if (priority === 'LOW') return 'priorità bassa'
  return 'priorità normale'
}

function response(
  actionKind: AssistantResponse['actionKind'],
  answerStatus: AssistantResponse['answerStatus'],
  text: string,
  evidenceCount: number,
): AssistantResponse {
  return {
    actionKind,
    answerStatus,
    grounding: { kind: 'PAGE_CONTEXT', evidenceCount: Math.max(1, evidenceCount) },
    text,
  }
}

function isWriteRequest(value: string) {
  return containsAny(value, ['crea ', 'creami', 'aggiungi', 'completa', 'segna', 'sposta', 'rimanda', 'ripianifica', 'riapri', 'elimina', 'rimuovi', 'metti in attesa'])
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('it-IT')
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}

function shorten(value: string, maxLength: number) {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`
}
