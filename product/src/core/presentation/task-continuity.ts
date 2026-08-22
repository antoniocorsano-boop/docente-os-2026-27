export type KnowledgeTaskMode = 'prepare' | 'class'

type KnowledgeTaskHrefInput = {
  mode: KnowledgeTaskMode
  returnTo: string
  sectionId?: string | null
  blockId?: string | null
}

export function buildTaskAwareKnowledgeHref(assetId: string, input: KnowledgeTaskHrefInput) {
  const params = new URLSearchParams()
  params.set('mode', input.mode)
  params.set('returnTo', sanitizeInternalReturnTo(input.returnTo, '/knowledge'))
  if (input.sectionId) params.set('section', input.sectionId)
  if (input.blockId) params.set('block', input.blockId)
  return `/knowledge/${encodeURIComponent(assetId)}?${params.toString()}`
}

export function asKnowledgeTaskMode(value?: string | null): KnowledgeTaskMode | null {
  return value === 'prepare' || value === 'class' ? value : null
}

export function sanitizeInternalReturnTo(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  try {
    const parsed = new URL(value, 'https://docente-os.local')
    if (parsed.origin !== 'https://docente-os.local') return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
