import type { TeachingSessionContinuity } from '@/core/domain/teaching-session-reflection'
import type { AssistantResponse } from './assistant-context'
import type { HomeDailyContext, HomeDailyLesson } from './home-daily-context'
import type { LessonCopilotContext } from './teacher-copilot-context'
import { respondToTodayCopilot, type TodayCopilotContext } from './today-copilot-context'

export type NextLessonKnowledgeResource = {
  assetId: string
  title: string
  categoryLabel: string
  relevanceLabel: 'Fase corrente' | 'Classe' | 'Grado'
}

export type NextLessonPreparation = {
  lesson: {
    logicalId: string
    startAt: string
    endAt: string
    title: string
    sectionId: string | null
    disciplineId: string | null
    authority: HomeDailyLesson['authority']
  }
  canonicalLesson: {
    sectionLabel: string
    blockId: string
    title: string
    objective: string
    durationMinutes: number
    udaTitle: string
    progressStatus: string
    preparationPreview: string[]
    remainingPreparationCount: number
    readyTitles: string[]
    readyCount: number
    statusLabel: LessonCopilotContext['lesson']['statusLabel']
  } | null
  continuity?: TeachingSessionContinuity | null
  knowledgeResources: NextLessonKnowledgeResource[]
  missingInformation: string[]
  provenance: Array<{ kind: string; ref?: string; label?: string }>
}

export type TodayCopilotK2Context = TodayCopilotContext & {
  nextLessonPreparation: NextLessonPreparation | null
}

export function selectNextLessonForPreparation(
  homeDaily: HomeDailyContext,
  minuteOfDay: number,
): HomeDailyLesson | null {
  if (homeDaily.authority === 'AMBIGUOUS' || homeDaily.authority === 'NONE') return null

  const current = homeDaily.lessons.filter((lesson) => {
    const start = lessonMinute(lesson.startAt)
    const end = lessonMinute(lesson.endAt)
    return start <= minuteOfDay && end > minuteOfDay
  })
  if (current.length === 1) return current[0]
  if (current.length > 1) return null

  const upcoming = homeDaily.lessons
    .filter((lesson) => lessonMinute(lesson.startAt) > minuteOfDay)
    .sort((a, b) => lessonMinute(a.startAt) - lessonMinute(b.startAt) || a.logicalId.localeCompare(b.logicalId))
  if (!upcoming.length) return null

  const earliest = lessonMinute(upcoming[0].startAt)
  const sameStart = upcoming.filter((lesson) => lessonMinute(lesson.startAt) === earliest)
  return sameStart.length === 1 ? sameStart[0] : null
}

export function buildNextLessonPreparation(input: {
  lesson: HomeDailyLesson
  lessonContext: LessonCopilotContext | null
  continuity?: TeachingSessionContinuity | null
  knowledgeResources?: NextLessonKnowledgeResource[]
  missingInformation?: string[]
}): NextLessonPreparation {
  const contextMissing = input.lessonContext?.missingInformation ?? []
  const missingInformation = unique([
    ...(input.missingInformation ?? []),
    ...contextMissing,
  ])

  const canonicalLesson = input.lessonContext
    ? {
        sectionLabel: input.lessonContext.lesson.sectionLabel,
        blockId: input.lessonContext.lesson.blockId,
        title: input.lessonContext.lesson.title,
        objective: input.lessonContext.lesson.objective,
        durationMinutes: input.lessonContext.lesson.durationMinutes,
        udaTitle: input.lessonContext.lesson.udaTitle,
        progressStatus: input.lessonContext.lesson.progressStatus,
        preparationPreview: [...input.lessonContext.lesson.preparationPreview],
        remainingPreparationCount: input.lessonContext.lesson.remainingPreparationCount,
        readyTitles: [...input.lessonContext.lesson.readyTitles],
        readyCount: input.lessonContext.lesson.readyCount,
        statusLabel: input.lessonContext.lesson.statusLabel,
      }
    : null
  const continuity = input.continuity ? { ...input.continuity } : null

  return {
    lesson: {
      logicalId: input.lesson.logicalId,
      startAt: input.lesson.startAt,
      endAt: input.lesson.endAt,
      title: input.lesson.title,
      sectionId: input.lesson.sectionId,
      disciplineId: input.lesson.disciplineId,
      authority: input.lesson.authority,
    },
    canonicalLesson,
    continuity,
    knowledgeResources: (input.knowledgeResources ?? []).slice(0, 4).map((resource) => ({ ...resource })),
    missingInformation,
    provenance: [
      {
        kind: input.lesson.authority === 'IN_FORCE' ? 'TIMETABLE_IN_FORCE' : 'TIMETABLE_PROVISIONAL_DRAFT',
        ref: input.lesson.timetableSlotId ? `timetable:${input.lesson.timetableSlotId}` : input.lesson.logicalId,
        label: input.lesson.title,
      },
      ...(input.lessonContext?.provenance.map((item) => ({ ...item })) ?? []),
      ...(continuity ? [{
        kind: 'TEACHING_SESSION_REFLECTION',
        ref: `teaching-session:${continuity.sourceSessionId}`,
        label: `Diario ${continuity.sourceLocalDate}`,
      }] : []),
      ...(input.knowledgeResources ?? []).slice(0, 4).map((resource) => ({
        kind: 'KNOWLEDGE_ASSET',
        ref: `knowledge:${resource.assetId}`,
        label: resource.title,
      })),
    ],
  }
}

export function enrichTodayCopilotContext(
  context: TodayCopilotContext,
  preparation: NextLessonPreparation | null,
): TodayCopilotK2Context {
  return {
    ...context,
    provenance: preparation
      ? mergeProvenance(context.provenance, preparation.provenance)
      : [...context.provenance],
    missingInformation: preparation
      ? unique([...context.missingInformation, ...preparation.missingInformation])
      : [...context.missingInformation],
    availableCapabilities: preparation?.canonicalLesson
      ? unique([...context.availableCapabilities, 'NEXT_LESSON_PREPARATION', 'LESSON_READ', 'KNOWLEDGE_READ'])
      : [...context.availableCapabilities],
    nextLessonPreparation: preparation,
  }
}

export function respondToTodayCopilotK2(context: TodayCopilotK2Context, prompt: string): AssistantResponse {
  const normalized = normalize(prompt)
  if (!containsAny(normalized, ['prossima lezione', 'prossimo lezione', 'preparare la prossima', 'preparo la prossima', 'cosa preparo'])) {
    return respondToTodayCopilot(context, prompt)
  }

  if (context.today.authority === 'AMBIGUOUS') return respondToTodayCopilot(context, prompt)

  const preparation = context.nextLessonPreparation
  if (!preparation) return respondToTodayCopilot(context, prompt)

  const canonical = preparation.canonicalLesson
  const lines = [
    '**Prossima lezione**',
    `• ${clock(preparation.lesson.startAt)}–${clock(preparation.lesson.endAt)} · ${preparation.lesson.title}`,
    preparation.lesson.authority === 'PROVISIONAL_DRAFT'
      ? 'La collocazione deriva da un orario provvisorio: la tratto come indicazione da confermare.'
      : 'La collocazione deriva dall’orario in vigore.',
  ]

  if (canonical) {
    lines.push(
      '',
      '**Dove siamo nel Piano**',
      `${canonical.blockId} · ${canonical.udaTitle}`,
      `Obiettivo: ${canonical.objective}`,
      '',
      '**Da preparare**',
      ...(canonical.preparationPreview.length
        ? canonical.preparationPreview.map((item) => `• ${item}`)
        : ['• Il Lesson Brief non contiene preparazioni esplicite.']),
    )
    if (canonical.remainingPreparationCount > 0) {
      lines.push(`• +${canonical.remainingPreparationCount} ulteriori elementi nel Lesson Brief`)
    }
    lines.push(
      '',
      '**Già pronto**',
      ...(canonical.readyTitles.length
        ? canonical.readyTitles.map((item) => `• ${item}`)
        : ['• Il Lesson Brief non segnala ancora materiali pronti.']),
      '',
      '**Conoscenza pertinente**',
      ...(preparation.knowledgeResources.length
        ? preparation.knowledgeResources.map((resource) => `• ${resource.title} · ${resource.relevanceLabel}`)
        : ['• Non risultano risorse della Conoscenza pertinenti già indicizzate per questa fase.']),
    )
  } else {
    lines.push(
      '',
      '**Preparazione didattica**',
      'La lezione temporale è identificata, ma non posso collegarla con sufficiente certezza a un blocco canonico del Piano annuale. Non invento il collegamento.',
    )
  }

  if (preparation.continuity) {
    lines.push(
      '',
      '**Continuità dal Diario**',
      `• ${preparation.continuity.nextActivity}`,
    )
  }

  if (preparation.missingInformation.length) {
    lines.push('', '**Da verificare**', ...preparation.missingInformation.map((item) => `• ${item}`))
  }

  lines.push(
    '',
    '**Limite operativo**',
    'Questa è una lettura e una proposta di preparazione: non modifico Piano, Planner, materiali o registrazioni senza un’azione separata e confermata.',
  )

  const partial = preparation.lesson.authority === 'PROVISIONAL_DRAFT'
    || !canonical
    || preparation.missingInformation.length > 0

  return {
    actionKind: 'PROPOSE',
    answerStatus: partial ? 'PARTIAL' : 'SUPPORTED',
    grounding: {
      kind: 'PAGE_CONTEXT',
      evidenceCount: Math.max(1, preparation.provenance.length),
    },
    text: lines.join('\n'),
  }
}

function lessonMinute(value: string) {
  const [hour, minute] = value.slice(11, 16).split(':').map(Number)
  return hour * 60 + minute
}

function clock(value: string) {
  return value.slice(11, 16)
}

function normalize(value: string) {
  return value.toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function containsAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle))
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function mergeProvenance(
  first: TodayCopilotContext['provenance'],
  second: TodayCopilotContext['provenance'],
) {
  const seen = new Set<string>()
  return [...first, ...second].filter((item) => {
    const key = `${item.kind}:${item.ref ?? ''}:${item.label ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
