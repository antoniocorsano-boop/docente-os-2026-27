import type { ProjectedCalendarState, ProjectedTimetableState } from '@/core/application/temporal-projection-service'
import type { HomeDailyContext, HomeDailyLesson } from './home-daily-context'
import type { AssistantContext, AssistantResponse, AssistantAnswerStatus } from './assistant-context'
import type { PlannerAssistantContext, PlannerAssistantTask } from './planner-assistant-context'

export type TodayCopilotContext = AssistantContext & {
  surface: 'TODAY'
  today: {
    localDate: string
    authority: HomeDailyContext['authority']
    calendarState: ProjectedCalendarState
    calendarLabel: string | null
    timetableState: ProjectedTimetableState
    lessons: HomeDailyLesson[]
    lessonCount: number
    pendingRegistrationCount: number
    primary: HomeDailyContext['primary']
  }
  planner: PlannerAssistantContext['planner']
}

export const TODAY_CONTEXT_CAPABILITIES = [
  'TODAY_READ',
  'TIMETABLE_READ',
  'TEACHING_SESSION_READ',
  'PLANNER_READ',
] as const

export const TODAY_CONTEXT_FORBIDDEN_CAPABILITIES = [
  'PLANNER_CREATE_TASK',
  'PLANNER_COMPLETE_TASK',
  'PLANNER_MOVE_TASK',
  'LESSON_RECORD_EXECUTION',
  'TIMETABLE_ACTIVATE',
  'CALENDAR_WRITE',
  'DRIVE_WRITE',
  'GMAIL_SEND',
] as const

export function buildTodayCopilotContext(input: {
  workspaceId: string
  academicYearId?: string | null
  homeDaily: HomeDailyContext
  calendarState: ProjectedCalendarState
  calendarLabel: string | null
  timetableState: ProjectedTimetableState
  planner: PlannerAssistantContext['planner']
}): TodayCopilotContext {
  const missingInformation: string[] = []

  if (!input.academicYearId) missingInformation.push('Anno scolastico non associato')
  if (input.homeDaily.authority === 'AMBIGUOUS') {
    missingInformation.push('La sorgente temporale della giornata è ambigua: non è possibile scegliere un orario in modo affidabile')
  }
  if (input.calendarState === 'UNDETERMINED') {
    missingInformation.push('Calendario scolastico del giorno non determinato')
  }
  if (input.timetableState === 'UNAVAILABLE' && input.calendarState !== 'NO_LESSONS' && input.homeDaily.authority !== 'PROVISIONAL_DRAFT') {
    missingInformation.push('Orario vigente non disponibile per la giornata')
  }

  const temporalAuthority = input.homeDaily.authority === 'IN_FORCE'
    ? 'TIMETABLE_IN_FORCE'
    : input.homeDaily.authority === 'PROVISIONAL_DRAFT'
      ? 'TIMETABLE_PROVISIONAL_DRAFT'
      : input.homeDaily.authority === 'AMBIGUOUS'
        ? 'TIMETABLE_AMBIGUOUS'
        : input.calendarState === 'NO_LESSONS'
          ? 'CALENDAR_NO_LESSONS'
          : 'TEMPORAL_CONTEXT_UNAVAILABLE'

  return {
    surface: 'TODAY',
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId ?? undefined,
    object: {
      type: 'TEACHER_DAY',
      id: input.homeDaily.localDate,
      title: `Giornata del ${input.homeDaily.localDate}`,
      state: input.homeDaily.authority,
    },
    provenance: [
      {
        kind: temporalAuthority,
        ref: `today:${input.homeDaily.localDate}`,
        label: temporalAuthorityLabel(input.homeDaily.authority, input.calendarState),
      },
      ...input.homeDaily.lessons
        .filter((lesson) => Boolean(lesson.timetableSlotId))
        .map((lesson) => ({
          kind: 'TIMETABLE_SLOT',
          ref: `timetable:${lesson.timetableSlotId}`,
          label: `${clock(lesson.startAt)} · ${lesson.title}`,
        })),
      { kind: 'PLANNER', ref: `planner:${input.homeDaily.localDate}`, label: 'Planner DOCENTE OS' },
    ],
    availableCapabilities: [...TODAY_CONTEXT_CAPABILITIES],
    forbiddenCapabilities: [...TODAY_CONTEXT_FORBIDDEN_CAPABILITIES],
    missingInformation,
    today: {
      localDate: input.homeDaily.localDate,
      authority: input.homeDaily.authority,
      calendarState: input.calendarState,
      calendarLabel: input.calendarLabel,
      timetableState: input.timetableState,
      lessons: input.homeDaily.lessons.map((lesson) => ({ ...lesson })),
      lessonCount: input.homeDaily.lessonCount,
      pendingRegistrationCount: input.homeDaily.pendingRegistrationCount,
      primary: input.homeDaily.primary
        ? {
            ...input.homeDaily.primary,
            lesson: input.homeDaily.primary.lesson ? { ...input.homeDaily.primary.lesson } : null,
          }
        : null,
    },
    planner: {
      ...input.planner,
      tasks: input.planner.tasks.map((task) => ({ ...task })),
    },
  }
}

export function respondToTodayCopilot(context: TodayCopilotContext, prompt: string): AssistantResponse {
  const normalized = normalize(prompt)

  if (containsAny(normalized, ['prossima lezione', 'prossimo lezione', 'dopo che classe', 'dopo quale classe', 'adesso che classe'])) {
    return nextLessonResponse(context)
  }

  if (containsAny(normalized, ['registr', 'da registrare', 'non registrat', 'lezioni svolte'])) {
    return pendingRegistrationResponse(context)
  }

  if (containsAny(normalized, ['lezion', 'orario', 'classi oggi', 'classe oggi', 'ore oggi'])) {
    return lessonsResponse(context)
  }

  if (containsAny(normalized, ['planner', 'attività', 'scaden', 'priorit', 'task'])) {
    return plannerResponse(context)
  }

  if (containsAny(normalized, ['oggi', 'giornata', 'cosa devo', 'cosa faccio', 'organizz', 'situazione', 'riepilog', 'prima'])) {
    return dayOverviewResponse(context)
  }

  return dayOverviewResponse(context)
}

function lessonsResponse(context: TodayCopilotContext): AssistantResponse {
  const t = context.today
  if (t.authority === 'AMBIGUOUS') {
    return response('READ_ONLY', 'PARTIAL', [
      '**Lezioni di oggi**',
      'Non scelgo un orario tra fonti incompatibili: il contesto temporale della giornata è ambiguo e deve essere verificato.',
      '',
      '**Cosa è certo**',
      plannerFact(context),
      '',
      '**Da verificare**',
      context.missingInformation.join('; ') || 'Orario della giornata.',
    ], evidenceCount(context))
  }

  if (t.calendarState === 'NO_LESSONS') {
    return response('READ_ONLY', 'SUPPORTED', [
      '**Lezioni di oggi**',
      `Il calendario indica che oggi non sono previste lezioni${t.calendarLabel ? `: ${t.calendarLabel}` : '.'}`,
      '',
      '**Planner**',
      plannerFact(context),
    ], evidenceCount(context))
  }

  if (t.lessonCount === 0) {
    const unavailable = t.timetableState === 'UNAVAILABLE' && t.authority !== 'PROVISIONAL_DRAFT'
    return response('READ_ONLY', unavailable ? 'PARTIAL' : 'NOT_FOUND', [
      '**Lezioni di oggi**',
      unavailable
        ? 'Non posso determinare in modo affidabile le lezioni di oggi perché l’orario vigente non è disponibile nel contesto corrente.'
        : 'Non risultano lezioni nella sorgente temporale disponibile per oggi.',
      '',
      '**Planner**',
      plannerFact(context),
    ], evidenceCount(context))
  }

  return response('READ_ONLY', temporalAnswerStatus(context), [
    '**Lezioni di oggi**',
    temporalAuthorityNotice(context),
    ...t.lessons.map((lesson) => `• ${lessonLine(lesson)}`),
    '',
    '**Stato della giornata**',
    t.pendingRegistrationCount
      ? `${t.pendingRegistrationCount} ${t.pendingRegistrationCount === 1 ? 'lezione conclusa risulta ancora da registrare' : 'lezioni concluse risultano ancora da registrare'}.`
      : 'Non risultano registrazioni di lezione pendenti tra le lezioni già concluse.',
  ], evidenceCount(context))
}

function nextLessonResponse(context: TodayCopilotContext): AssistantResponse {
  const primary = context.today.primary

  if (context.today.authority === 'AMBIGUOUS' || primary?.kind === 'AMBIGUOUS') {
    return response('READ_ONLY', 'PARTIAL', [
      '**Prossima lezione**',
      'Non posso individuarla senza scegliere arbitrariamente tra dati temporali ambigui.',
      '',
      '**Da verificare**',
      context.missingInformation.join('; ') || 'Orario della giornata.',
    ], evidenceCount(context))
  }

  if (primary?.kind === 'CURRENT_LESSON' && primary.lesson) {
    return response('READ_ONLY', temporalAnswerStatus(context), [
      '**Adesso**',
      `È in corso ${lessonLine(primary.lesson)}.`,
      '',
      '**Fonte temporale**',
      temporalAuthorityNotice(context),
    ], evidenceCount(context))
  }

  if (primary?.kind === 'UPCOMING_LESSON' && primary.lesson) {
    return response('READ_ONLY', temporalAnswerStatus(context), [
      '**Prossima lezione**',
      `• ${lessonLine(primary.lesson)}`,
      primary.minutesUntilStart !== null ? `Inizia tra circa ${primary.minutesUntilStart} minuti.` : '',
      '',
      '**Fonte temporale**',
      temporalAuthorityNotice(context),
    ].filter(Boolean), evidenceCount(context))
  }

  const upcoming = context.today.lessons.find((lesson) => !lesson.recorded)
  if (upcoming) {
    return response('READ_ONLY', temporalAnswerStatus(context), [
      '**Lezione da tenere davanti**',
      `• ${lessonLine(upcoming)}`,
      '',
      '**Nota**',
      'Il contesto non la classifica come prossima in questo momento; la mostro soltanto come lezione disponibile nella giornata.',
    ], evidenceCount(context))
  }

  return response('READ_ONLY', context.today.calendarState === 'NO_LESSONS' ? 'SUPPORTED' : 'NOT_FOUND', [
    '**Prossima lezione**',
    context.today.calendarState === 'NO_LESSONS'
      ? 'Oggi il calendario non prevede lezioni.'
      : 'Non risulta una prossima lezione nella giornata disponibile.',
  ], evidenceCount(context))
}

function pendingRegistrationResponse(context: TodayCopilotContext): AssistantResponse {
  const pending = context.today.lessons.filter((lesson) => !lesson.recorded && hasEndedRelativeToPrimary(context, lesson))
  const declaredCount = context.today.pendingRegistrationCount

  return response('PROPOSE', context.today.authority === 'AMBIGUOUS' ? 'PARTIAL' : 'SUPPORTED', [
    '**Registrazioni di oggi**',
    declaredCount === 0
      ? 'Non risultano lezioni concluse ancora da registrare.'
      : `Risultano ${declaredCount} ${declaredCount === 1 ? 'lezione conclusa da registrare' : 'lezioni concluse da registrare'}.`,
    ...pending.slice(0, 5).map((lesson) => `• ${lessonLine(lesson)}`),
    '',
    '**Limite operativo**',
    'Non registro automaticamente una lezione: posso indicare ciò che manca e accompagnarti alla registrazione esplicita.',
  ], evidenceCount(context))
}

function plannerResponse(context: TodayCopilotContext): AssistantResponse {
  const p = context.planner
  const relevant = plannerTasksForToday(context).slice(0, 5)
  return response('PROPOSE', 'SUPPORTED', [
    '**Planner di oggi**',
    p.todayCount || p.overdueCount
      ? `${p.todayCount} attività riguardano oggi e ${p.overdueCount} risultano scadute.`
      : 'Non risultano attività del Planner pianificate o in scadenza oggi.',
    ...relevant.map((task) => `• ${taskLine(task, p.localDate)}`),
    '',
    '**Da non confondere**',
    `${p.todayCount} attività nel Planner non significa ${context.today.lessonCount} lezioni: lezioni e attività sono due sorgenti distinte della giornata.`,
  ], evidenceCount(context))
}

function dayOverviewResponse(context: TodayCopilotContext): AssistantResponse {
  const t = context.today
  const plannerTasks = plannerTasksForToday(context).slice(0, 4)
  const temporalStatus = temporalAnswerStatus(context)

  const lessonSection = t.authority === 'AMBIGUOUS'
    ? ['Il quadro delle lezioni è ambiguo: non scelgo una fonte al posto tuo.']
    : t.calendarState === 'NO_LESSONS'
      ? [`Il calendario non prevede lezioni${t.calendarLabel ? ` (${t.calendarLabel})` : ''}.`]
      : t.lessonCount
        ? [temporalAuthorityNotice(context), ...t.lessons.map((lesson) => `• ${lessonLine(lesson)}`)]
        : ['Le lezioni non sono determinabili con sufficiente affidabilità dal contesto temporale disponibile.']

  return response('READ_ONLY', temporalStatus, [
    '**Lezioni**',
    ...lessonSection,
    '',
    '**Attività Planner**',
    context.planner.todayCount || context.planner.overdueCount
      ? `${context.planner.todayCount} attività riguardano oggi; ${context.planner.overdueCount} sono scadute.`
      : 'Non risultano attività del Planner pianificate o in scadenza oggi.',
    ...plannerTasks.map((task) => `• ${taskLine(task, context.planner.localDate)}`),
    '',
    '**Registrazioni**',
    t.pendingRegistrationCount
      ? `${t.pendingRegistrationCount} ${t.pendingRegistrationCount === 1 ? 'lezione conclusa è ancora da registrare' : 'lezioni concluse sono ancora da registrare'}.`
      : 'Non risultano registrazioni pendenti tra le lezioni concluse.',
    '',
    '**Lettura corretta**',
    'DOCENTE OS mantiene distinti orario, lezioni e Planner: un dominio vuoto non viene usato per dedurre che anche gli altri siano vuoti.',
  ], evidenceCount(context))
}

function temporalAnswerStatus(context: TodayCopilotContext): AssistantAnswerStatus {
  if (context.today.authority === 'AMBIGUOUS') return 'PARTIAL'
  if (context.today.authority === 'PROVISIONAL_DRAFT') return 'PARTIAL'
  if (context.today.calendarState === 'UNDETERMINED') return 'PARTIAL'
  if (context.today.timetableState === 'UNAVAILABLE' && context.today.calendarState !== 'NO_LESSONS') return 'PARTIAL'
  return 'SUPPORTED'
}

function temporalAuthorityNotice(context: TodayCopilotContext) {
  if (context.today.authority === 'PROVISIONAL_DRAFT') return 'Uso l’orario provvisorio applicabile alla data: non lo presento come definitivo.'
  if (context.today.authority === 'IN_FORCE') return 'Uso l’orario in vigore per la data corrente.'
  return 'Uso la migliore sorgente temporale disponibile senza inferire dati mancanti.'
}

function temporalAuthorityLabel(authority: HomeDailyContext['authority'], calendarState: ProjectedCalendarState) {
  if (authority === 'IN_FORCE') return 'Orario in vigore per la giornata'
  if (authority === 'PROVISIONAL_DRAFT') return 'Orario provvisorio applicabile alla giornata'
  if (authority === 'AMBIGUOUS') return 'Sorgenti temporali ambigue'
  if (calendarState === 'NO_LESSONS') return 'Calendario: nessuna lezione prevista'
  return 'Contesto temporale non disponibile'
}

function plannerTasksForToday(context: TodayCopilotContext) {
  const date = context.planner.localDate
  return context.planner.tasks
    .filter((task) => task.status === 'OPEN')
    .filter((task) => task.plannedFor === date || Boolean(task.dueDate && task.dueDate <= date) || task.priority === 'URGENT')
}

function plannerFact(context: TodayCopilotContext) {
  const p = context.planner
  return p.todayCount || p.overdueCount
    ? `Nel Planner risultano ${p.todayCount} attività per oggi e ${p.overdueCount} scadute.`
    : 'Nel Planner non risultano attività pianificate o in scadenza oggi.'
}

function lessonLine(lesson: HomeDailyLesson) {
  const state = lesson.recorded ? ' · registrata' : ''
  return `${clock(lesson.startAt)}–${clock(lesson.endAt)} · ${lesson.title}${state}`
}

function taskLine(task: PlannerAssistantTask, localDate: string) {
  const facts: string[] = []
  if (task.dueDate) facts.push(task.dueDate < localDate ? `scaduta il ${task.dueDate}` : task.dueDate === localDate ? 'scade oggi' : `scade ${task.dueDate}`)
  if (task.plannedFor) facts.push(task.plannedFor === localDate ? 'pianificata oggi' : `pianificata ${task.plannedFor}`)
  if (task.priority === 'URGENT') facts.push('urgente')
  else if (task.priority === 'HIGH') facts.push('priorità alta')
  return `${task.title}${facts.length ? ` — ${facts.join(', ')}` : ''}`
}

function hasEndedRelativeToPrimary(context: TodayCopilotContext, lesson: HomeDailyLesson) {
  if (lesson.recorded) return false
  if (context.today.primary?.kind === 'PENDING_REGISTRATION' && context.today.primary.lesson?.logicalId === lesson.logicalId) return true
  return context.today.pendingRegistrationCount > 0
}

function evidenceCount(context: TodayCopilotContext) {
  return Math.max(1, context.provenance.length)
}

function response(
  actionKind: 'READ_ONLY' | 'PROPOSE',
  answerStatus: AssistantAnswerStatus,
  lines: string[],
  evidence: number,
): AssistantResponse {
  return {
    actionKind,
    answerStatus,
    grounding: { kind: 'PAGE_CONTEXT', evidenceCount: evidence },
    text: lines.filter((line, index) => line !== '' || lines[index - 1] !== '').join('\n'),
  }
}

function clock(value: string) {
  return value.slice(11, 16)
}

function normalize(value: string) {
  return value.toLocaleLowerCase('it-IT').replace(/\s+/g, ' ').trim()
}

function containsAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => value.includes(candidate))
}
