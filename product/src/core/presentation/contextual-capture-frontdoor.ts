export const CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH = 1800

const LESSON_REFLECTION_PREFIX = 'Organizza questa nota di fine lezione:\n'

export function buildLessonReflectionCapturePrompt(text: string) {
  const normalized = normalizeText(text)
  if (!normalized) throw new Error('Contextual capture text required')
  if (normalized.length > CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH) {
    throw new Error(`Contextual capture text exceeds ${CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH} characters`)
  }
  return `${LESSON_REFLECTION_PREFIX}${normalized}`
}

export function parseLessonReflectionCapturePrompt(prompt: string): string | null {
  if (!prompt.startsWith(LESSON_REFLECTION_PREFIX)) return null
  const text = normalizeText(prompt.slice(LESSON_REFLECTION_PREFIX.length))
  if (!text || text.length > CONTEXTUAL_CAPTURE_MAX_TEXT_LENGTH) return null
  return text
}

export function matchesLessonReflectionCaptureIntent(prompt: string) {
  return parseLessonReflectionCapturePrompt(prompt) !== null
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}
