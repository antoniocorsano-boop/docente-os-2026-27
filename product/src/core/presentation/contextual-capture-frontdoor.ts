import type { ContextualCaptureSourceKind } from './contextual-capture'

export const CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH = 1800

const LESSON_REFLECTION_PREFIX = 'Organizza questa nota di fine lezione:\n'
const LESSON_REFLECTION_TRANSCRIPT_PREFIX = 'Organizza questa trascrizione di fine lezione:\n'

export function buildLessonReflectionCapturePrompt(
  text: string,
  sourceKind: ContextualCaptureSourceKind = 'MANUAL_TEXT',
) {
  const normalized = normalizeText(text)
  if (!normalized) throw new Error('Contextual capture text required')
  if (normalized.length > CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH) {
    throw new Error(`Contextual capture text exceeds ${CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH} characters`)
  }
  const prefix = sourceKind === 'EPHEMERAL_TRANSCRIPT'
    ? LESSON_REFLECTION_TRANSCRIPT_PREFIX
    : LESSON_REFLECTION_PREFIX
  return `${prefix}${normalized}`
}

export function parseLessonReflectionCaptureRequest(prompt: string): {
  text: string
  sourceKind: ContextualCaptureSourceKind
} | null {
  const matched = prompt.startsWith(LESSON_REFLECTION_TRANSCRIPT_PREFIX)
    ? { prefix: LESSON_REFLECTION_TRANSCRIPT_PREFIX, sourceKind: 'EPHEMERAL_TRANSCRIPT' as const }
    : prompt.startsWith(LESSON_REFLECTION_PREFIX)
      ? { prefix: LESSON_REFLECTION_PREFIX, sourceKind: 'MANUAL_TEXT' as const }
      : null
  if (!matched) return null

  const text = normalizeText(prompt.slice(matched.prefix.length))
  if (!text || text.length > CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH) return null
  return { text, sourceKind: matched.sourceKind }
}

export function parseLessonReflectionCapturePrompt(prompt: string): string | null {
  return parseLessonReflectionCaptureRequest(prompt)?.text ?? null
}

export function matchesLessonReflectionCaptureIntent(prompt: string) {
  return parseLessonReflectionCaptureRequest(prompt) !== null
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}
