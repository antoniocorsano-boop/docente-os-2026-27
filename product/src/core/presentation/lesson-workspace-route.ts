export type CanonicalLessonWorkspaceContext = {
  localDate?: string | null
  occurrenceLogicalId?: string | null
  intent?: 'start' | 'close' | null
  subtask?: 'observe' | 'materials' | null
}

export function buildCanonicalLessonWorkspaceHref(
  sectionId: string,
  blockId: string,
  context: CanonicalLessonWorkspaceContext = {},
) {
  const base = `/classi/${encodeURIComponent(sectionId)}/lezioni/${encodeURIComponent(blockId)}`
  const query = new URLSearchParams()

  if (context.localDate) query.set('date', context.localDate)
  if (context.occurrenceLogicalId) query.set('occurrence', context.occurrenceLogicalId)
  if (context.intent) query.set('intent', context.intent)
  if (context.subtask) query.set('subtask', context.subtask)

  const encoded = query.toString()
  return encoded ? `${base}?${encoded}` : base
}
