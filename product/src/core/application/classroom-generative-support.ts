import type {
  AiOrchestratorPort,
  ClassroomAiContext,
  ClassroomImageProposal,
  ClassroomTextProposal,
  ClassroomTextSupportKind,
} from './ports/ai-orchestrator'

const MAX_TITLE = 180
const MAX_INSTRUCTION = 1200
const MAX_HINT = 900

export type ClassroomGenerativeContextInput = {
  lessonTitle: string
  stepTitle: string
  instruction: string
  cue?: string | null
  localHint?: string | null
  visualBrief?: string | null
  // Deliberately ignored: callers may hold richer classroom/session objects,
  // but only the allowlisted fields above may cross the AI boundary.
  [key: string]: unknown
}

export class ClassroomGenerativeSupportService {
  constructor(private readonly orchestrator: AiOrchestratorPort) {}

  proposeText(input: ClassroomGenerativeContextInput, kind: ClassroomTextSupportKind): Promise<ClassroomTextProposal> {
    return this.orchestrator.proposeClassroomText({ kind, context: minimizeClassroomAiContext(input) })
  }

  proposeImage(input: ClassroomGenerativeContextInput): Promise<ClassroomImageProposal> {
    const context = minimizeClassroomAiContext(input)
    if (!context.visualBrief) throw new Error('A grounded visual brief is required before image generation')
    return this.orchestrator.proposeClassroomImage({ context })
  }
}

export function minimizeClassroomAiContext(input: ClassroomGenerativeContextInput): ClassroomAiContext {
  const lessonTitle = requiredText(input.lessonTitle, MAX_TITLE, 'lessonTitle')
  const stepTitle = requiredText(input.stepTitle, MAX_TITLE, 'stepTitle')
  const instruction = requiredText(input.instruction, MAX_INSTRUCTION, 'instruction')

  return {
    lessonTitle,
    stepTitle,
    instruction,
    cue: optionalText(input.cue, MAX_HINT),
    localHint: optionalText(input.localHint, MAX_HINT),
    visualBrief: optionalText(input.visualBrief, MAX_HINT),
  }
}

function requiredText(value: unknown, max: number, field: string) {
  const text = optionalText(value, max)
  if (!text) throw new Error(`${field} is required`)
  return text
}

function optionalText(value: unknown, max: number) {
  if (typeof value !== 'string') return null
  const text = value.replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, max) : null
}
