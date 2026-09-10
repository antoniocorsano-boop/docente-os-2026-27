export type ClassroomTextSupportKind = 'SIMPLER' | 'EXAMPLE' | 'CHECK'

export type ClassroomAiContext = {
  lessonTitle: string
  stepTitle: string
  instruction: string
  cue: string | null
  localHint: string | null
  visualBrief: string | null
}

export type ClassroomTextProposal = {
  capability: 'CLASSROOM_TEXT_PROPOSE'
  status: 'PROPOSED'
  text: string
  provider: string
  model: string
}

export type ClassroomImageProposal = {
  capability: 'CLASSROOM_IMAGE_GENERATE'
  status: 'PROPOSED'
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
  base64: string
  altText: string
  provider: string
  model: string
}

export interface AiOrchestratorPort {
  proposeClassroomText(input: {
    kind: ClassroomTextSupportKind
    context: ClassroomAiContext
  }): Promise<ClassroomTextProposal>

  proposeClassroomImage(input: {
    context: ClassroomAiContext
  }): Promise<ClassroomImageProposal>
}

export class AiProviderUnavailableError extends Error {
  constructor(message = 'AI provider is not configured') {
    super(message)
    this.name = 'AiProviderUnavailableError'
  }
}
