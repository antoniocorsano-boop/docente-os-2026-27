import type { HumanTaskLessonProjection } from './human-task-content'
import type { LessonBrief } from './lesson-brief'
import type { TeacherMoment } from './teacher-moment'
import type { AssistantContext, AssistantAnswerStatus, AssistantActionKind } from './assistant-context'

export type LessonCopilotContext = AssistantContext & {
  surface: 'LESSON'
  lesson: {
    sectionId: string
    sectionLabel: string
    blockId: string
    projectionId: string
    title: string
    objective: string
    durationMinutes: number
    udaTitle: string
    progressStatus: string
    preparationPreview: string[]
    remainingPreparationCount: number
    readyTitles: string[]
    readyCount: number
    statusLabel: LessonBrief['statusLabel']
  }
}

export type TeacherMomentCopilotContext = AssistantContext & {
  surface: 'TODAY'
  teacherMoment: {
    mode: TeacherMoment['mode']
    localDate: string
    daysAhead: number
    authority: TeacherMoment['authority']
    calendarLabel: string | null
    lessons: Array<{
      startTime: string
      endTime: string
      sectionLabel: string | null
      disciplineLabel: string | null
      room: string | null
    }>
  }
}

export type TeacherCopilotResponse = {
  actionKind: Extract<AssistantActionKind, 'READ_ONLY' | 'PROPOSE'>
  answerStatus: AssistantAnswerStatus
  text: string
  evidenceRefs: string[]
}

export const LESSON_COPILOT_CAPABILITIES = [
  'LESSON_EXPLAIN_CONTEXT',
  'LESSON_SUMMARIZE_READINESS',
  'LESSON_SUGGEST_PREPARATION',
  'LESSON_SUGGEST_ADAPTATION',
  'LESSON_STRUCTURE_REFLECTION',
] as const

export const LESSON_COPILOT_FORBIDDEN_CAPABILITIES = [
  'LESSON_RECORD_EXECUTION',
  'LESSON_SAVE_OBSERVATION',
  'PLAN_COMPLETE_BLOCK',
  'PLAN_UPDATE_PROGRESS',
  'CALENDAR_WRITE',
  'DRIVE_WRITE',
  'GMAIL_SEND',
] as const

export const TODAY_COPILOT_CAPABILITIES = [
  'TODAY_EXPLAIN_NEXT_STEP',
  'TODAY_SUMMARIZE_NEXT_MOMENT',
  'TODAY_SUGGEST_PREPARATION',
] as const

export const TODAY_COPILOT_FORBIDDEN_CAPABILITIES = [
  'PLANNER_CREATE_TASK',
  'CALENDAR_WRITE',
  'TIMETABLE_ACTIVATE',
  'PLAN_UPDATE_PROGRESS',
  'DRIVE_WRITE',
  'GMAIL_SEND',
] as const

export function buildLessonCopilotContext(input: {
  workspaceId: string
  academicYearId?: string | null
  discipline?: string | null
  sectionId: string
  sectionLabel: string
  blockId: string
  projection: HumanTaskLessonProjection
  brief: LessonBrief
  progressStatus: string
}): LessonCopilotContext {
  const missingInformation: string[] = []
  if (!input.academicYearId) missingInformation.push('Anno scolastico non associato')
  if (!input.discipline?.trim()) missingInformation.push('Disciplina non associata')
  if (input.projection.sources.length === 0) missingInformation.push('Fonti della lezione non disponibili')

  return {
    surface: 'LESSON',
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId ?? undefined,
    discipline: cleanOptional(input.discipline),
    classLabel: cleanRequired(input.sectionLabel),
    object: {
      type: 'LESSON_PROJECTION',
      id: `${input.sectionId}:${input.blockId}:${input.projection.projectionId}`,
      title: input.projection.title,
      state: input.progressStatus,
    },
    provenance: input.projection.sources.map((source) => ({
      kind: source.role,
      ref: source.code,
      label: source.label,
    })),
    availableCapabilities: [...LESSON_COPILOT_CAPABILITIES],
    forbiddenCapabilities: [...LESSON_COPILOT_FORBIDDEN_CAPABILITIES],
    missingInformation,
    lesson: {
      sectionId: input.sectionId,
      sectionLabel: cleanRequired(input.sectionLabel),
      blockId: input.blockId,
      projectionId: input.projection.projectionId,
      title: input.projection.title,
      objective: input.projection.objective,
      durationMinutes: input.projection.durationMinutes,
      udaTitle: input.projection.udaTitle,
      progressStatus: input.progressStatus,
      preparationPreview: [...input.brief.preparationPreview],
      remainingPreparationCount: input.brief.remainingPreparationCount,
      readyTitles: [...input.brief.readyTitles],
      readyCount: input.brief.readyCount,
      statusLabel: input.brief.statusLabel,
    },
  }
}

export function buildTeacherMomentCopilotContext(input: {
  workspaceId: string
  academicYearId?: string | null
  discipline?: string | null
  moment: TeacherMoment
}): TeacherMomentCopilotContext {
  const classes = unique(input.moment.lessons.map((lesson) => lesson.sectionLabel).filter((value): value is string => Boolean(value)))
  const disciplines = unique(input.moment.lessons.map((lesson) => lesson.disciplineLabel).filter((value): value is string => Boolean(value)))
  const missingInformation: string[] = []
  if (!input.academicYearId) missingInformation.push('Anno scolastico non associato')
  if (input.moment.authority !== 'CALENDAR_CONFIRMED') missingInformation.push('Calendario del giorno non confermato')

  return {
    surface: 'TODAY',
    workspaceId: input.workspaceId,
    academicYearId: input.academicYearId ?? undefined,
    discipline: cleanOptional(input.discipline) ?? (disciplines.length === 1 ? disciplines[0] : undefined),
    classLabel: classes.length === 1 ? classes[0] : undefined,
    object: {
      type: 'TEACHER_MOMENT',
      id: `${input.moment.localDate}:${input.moment.mode}`,
      title: input.moment.daysAhead === 1 ? 'Prossimo momento: domani' : `Prossimo momento: ${input.moment.localDate}`,
      state: input.moment.authority,
    },
    provenance: [
      {
        kind: 'TEMPORAL_PROJECTION',
        ref: `teacher-moment:${input.moment.localDate}`,
        label: authorityLabel(input.moment.authority),
      },
      ...input.moment.lessons.map((lesson) => ({
        kind: 'TIMETABLE_SLOT',
        ref: `timetable:${lesson.timetableSlotId}`,
        label: [lesson.startTime, lesson.sectionLabel, lesson.disciplineLabel].filter(Boolean).join(' · '),
      })),
    ],
    availableCapabilities: [...TODAY_COPILOT_CAPABILITIES],
    forbiddenCapabilities: [...TODAY_COPILOT_FORBIDDEN_CAPABILITIES],
    missingInformation,
    teacherMoment: {
      mode: input.moment.mode,
      localDate: input.moment.localDate,
      daysAhead: input.moment.daysAhead,
      authority: input.moment.authority,
      calendarLabel: input.moment.calendarLabel,
      lessons: input.moment.lessons.map((lesson) => ({
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        sectionLabel: lesson.sectionLabel,
        disciplineLabel: lesson.disciplineLabel,
        room: lesson.room,
      })),
    },
  }
}

export function lessonCopilotProviderContext(context: LessonCopilotContext) {
  return {
    surface: context.surface,
    discipline: context.discipline ?? null,
    classLabel: context.classLabel ?? null,
    lesson: {
      title: context.lesson.title,
      objective: context.lesson.objective,
      durationMinutes: context.lesson.durationMinutes,
      udaTitle: context.lesson.udaTitle,
      progressStatus: context.lesson.progressStatus,
      preparationPreview: context.lesson.preparationPreview,
      remainingPreparationCount: context.lesson.remainingPreparationCount,
      readyCount: context.lesson.readyCount,
      statusLabel: context.lesson.statusLabel,
    },
    provenance: context.provenance.map((item) => ({
      ref: item.ref ?? null,
      label: item.label ?? item.kind,
      kind: item.kind,
    })),
    availableCapabilities: context.availableCapabilities,
    forbiddenCapabilities: context.forbiddenCapabilities,
    missingInformation: context.missingInformation,
  }
}

export function validateTeacherCopilotResponse(
  context: LessonCopilotContext,
  response: TeacherCopilotResponse,
) {
  const problems: string[] = []
  const knownRefs = new Set(context.provenance.map((item) => item.ref).filter((value): value is string => Boolean(value)))

  if (response.actionKind !== 'READ_ONLY' && response.actionKind !== 'PROPOSE') {
    problems.push('Il copilota V1-C1 può soltanto leggere o proporre.')
  }
  if (!['SUPPORTED', 'PARTIAL', 'NOT_FOUND'].includes(response.answerStatus)) {
    problems.push('Stato risposta non riconosciuto.')
  }
  if (response.text.trim().length < 30) problems.push('Risposta troppo breve per essere utile.')
  for (const ref of response.evidenceRefs) {
    if (!knownRefs.has(ref)) problems.push(`Riferimento di evidenza non disponibile: ${ref}`)
  }

  return { valid: problems.length === 0, problems }
}

export function fallbackLessonCopilotResponse(
  context: LessonCopilotContext,
  prompt: string,
): TeacherCopilotResponse {
  const normalized = prompt.toLocaleLowerCase('it-IT')
  const asksPreparation = /(prepar|serve|material|pronto|manca)/.test(normalized)
  const asksReflection = /(andat|success|riflett|osserv|riprend|prossima)/.test(normalized)

  if (asksPreparation) {
    const preparation = context.lesson.preparationPreview.length
      ? context.lesson.preparationPreview.map((item) => `• ${item}`).join('\n')
      : '• Non risultano elementi di preparazione espliciti nel brief corrente.'
    const ready = context.lesson.readyTitles.length
      ? context.lesson.readyTitles.map((item) => `• ${item}`).join('\n')
      : '• Non risultano materiali già marcati come pronti nel brief corrente.'
    return {
      actionKind: 'PROPOSE',
      answerStatus: 'SUPPORTED',
      evidenceRefs: context.provenance.map((item) => item.ref).filter((value): value is string => Boolean(value)).slice(0, 3),
      text: `**Per preparare questa lezione**\n${preparation}\n\n**Già pronto**\n${ready}\n\n**Indicazione**\nL’obiettivo è: ${context.lesson.objective}. Posso aiutarti a ridurre o adattare la preparazione, ma non modifico la progettazione senza una conferma separata.`,
    }
  }

  if (asksReflection) {
    return {
      actionKind: 'PROPOSE',
      answerStatus: 'SUPPORTED',
      evidenceRefs: context.provenance.map((item) => item.ref).filter((value): value is string => Boolean(value)).slice(0, 3),
      text: `**Contesto della lezione**\n${context.lesson.title} · ${context.lesson.sectionLabel}.\n\n**Per riflettere**\nPuoi raccontarmi cosa è stato realmente svolto, cosa è rimasto incerto e cosa vuoi riprendere. In V1-C1 organizzo la risposta come proposta, senza salvare o completare automaticamente il Piano.`,
    }
  }

  return {
    actionKind: 'READ_ONLY',
    answerStatus: 'SUPPORTED',
    evidenceRefs: context.provenance.map((item) => item.ref).filter((value): value is string => Boolean(value)).slice(0, 3),
    text: `**Questa lezione**\n${context.lesson.title} · ${context.lesson.sectionLabel} · ${formatMinutes(context.lesson.durationMinutes)}.\n\n**Obiettivo**\n${context.lesson.objective}\n\n**Stato**\n${context.lesson.readyCount > 0 ? `${context.lesson.readyCount} risorse risultano già pronte.` : 'Il brief non segnala ancora risorse pronte.'} Posso spiegare, proporre una preparazione o aiutarti a riflettere senza modificare dati automaticamente.`,
  }
}

function authorityLabel(authority: TeacherMoment['authority']) {
  if (authority === 'CALENDAR_CONFIRMED') return 'Calendario e Orario confermano il prossimo momento'
  if (authority === 'PROVISIONAL_DRAFT') return 'Orario provvisorio; Calendario da confermare'
  return 'Orario disponibile; Calendario da confermare'
}

function cleanRequired(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function cleanOptional(value: string | null | undefined) {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  return normalized || undefined
}

function unique(values: string[]) {
  return [...new Set(values.map(cleanRequired).filter(Boolean))]
}

function formatMinutes(minutes: number) {
  if (minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? 'ora' : 'ore'}`
  return `${minutes} min`
}
